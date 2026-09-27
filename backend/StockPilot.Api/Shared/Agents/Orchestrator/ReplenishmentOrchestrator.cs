using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.AgenticAI.DemandForecastAgent;
using StockPilot.Application.AgenticAI.ProcurementCoordinator;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Domain.Enums;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Agents.Orchestrator;

public interface IReplenishmentOrchestrator
{
    /// <summary>
    /// Runs one replenishment check for a product at a branch through the four agents. Never throws for bad
    /// input or agent failures: those come back as a result with a terminal status, and are recorded in the trace.
    /// </summary>
    Task<ReplenishmentWorkflowResult> StartAsync(JsonElement objective, string initiatedBy, CancellationToken cancellationToken);

    Task<ReplenishmentWorkflowDetail?> GetWorkflowAsync(Guid workflowId, CancellationToken cancellationToken);
}

/// <summary>
/// Multi-agent Replenishment Orchestrator: plan → delegate → tools → validate → approve → result.
///
/// It connects the four existing agents through their existing entry points and adds no reasoning of its own:
/// <list type="number">
/// <item><b>Inventory Optimization Agent</b> (S1) decides whether the branch needs stock and whether it is a transfer or a reorder.</item>
/// <item><b>Demand Forecast Agent</b> (S2) sizes a reorder (integration decision D12: Inventory triggers, Forecast sizes).</item>
/// <item><b>Supplier Evaluation Agent</b> (S3) picks the quotation (its pick is surfaced by integration decision D11).</item>
/// <item><b>Procurement Coordinator Agent</b> (S4) runs budget and business-rule checks and creates the proposal.</item>
/// </list>
/// The step order is fixed and each edge is a plain condition on the previous agent's output; no model chooses
/// the next step. Every hand-off is validated against the receiving or producing agent's published contract, and
/// the run is checkpointed to AgentWorkflowAudits after every step. The orchestrator never approves anything:
/// transfers wait in the Inventory module and proposals wait for a human decision in Procurement.
/// </summary>
public class ReplenishmentOrchestrator(
    IInventoryOptimizationService inventoryOptimizationAgent,
    IDemandForecastAgent demandForecastAgent,
    ISupplierEvaluationService supplierEvaluationAgent,
    IProcurementCoordinatorAgent procurementCoordinatorAgent,
    IAgentContractValidator contracts,
    IAgentSchemaValidator procurementSchemas,
    InventorySupplierDbContext inventory,
    IAgentWorkflowTraceStore traceStore,
    ILogger<ReplenishmentOrchestrator> logger) : IReplenishmentOrchestrator
{
    public const string AgentName = "ReplenishmentOrchestrator";
    public const string InputContract = "replenishment-orchestrator.workflow-input.schema.json";
    public const string OutputContract = "replenishment-orchestrator.workflow-output.schema.json";
    public const string ForecastContract = "demand-forecast-agent-contract.json";
    public const string SupplierEvaluationContract = "supplier-evaluation-output.schema.json";

    private const string RunningStatus = "Running";

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    /// <summary>Steps in execution order. <see cref="AwaitHumanApproval"/> and <see cref="Stop"/> are terminal.</summary>
    private enum Step
    {
        Plan,
        InventoryOptimization,
        DemandForecast,
        SupplierEvaluation,
        ProcurementCoordinator,
        AwaitHumanApproval,
        Stop
    }

    private static readonly (Step Step, string Action)[] PlanTemplate =
    [
        (Step.Plan, "Plan: validate the objective and load branch, product and stock"),
        (Step.InventoryOptimization, "Delegate to Inventory Optimization Agent: no action, transfer or reorder"),
        (Step.DemandForecast, "Delegate to Demand Forecast Agent: size the reorder"),
        (Step.SupplierEvaluation, "Delegate to Supplier Evaluation Agent: choose the quotation"),
        (Step.ProcurementCoordinator, "Delegate to Procurement Coordinator Agent: budget/rule checks and proposal"),
        (Step.AwaitHumanApproval, "Stop for human approval in the owning module")
    ];

    /// <summary>Mutable state of one run.</summary>
    private sealed class Run(WorkflowStateDto state, AgentWorkflowAudit audit)
    {
        public WorkflowStateDto State { get; } = state;
        public AgentWorkflowAudit Audit { get; } = audit;
        public Stopwatch Clock { get; } = Stopwatch.StartNew();
        public JsonElement? Input { get; set; }
        public string Status { get; set; } = RunningStatus;

        public ReplenishmentObjective? Objective { get; set; }
        public Branch? Branch { get; set; }
        public Product? Product { get; set; }
        public decimal AvailableStock { get; set; }

        public AiRecommendation? Recommendation { get; set; }
        public Guid? ForecastWorkflowId { get; set; }
        public decimal? ForecastReorderQuantity { get; set; }
        public int? OrderQuantity { get; set; }
        public Guid? SelectedSupplierId { get; set; }
        public Guid? SelectedQuotationId { get; set; }
        public Guid? ProcurementWorkflowId { get; set; }
        public Guid? ProposalId { get; set; }
        public string? NextAction { get; set; }

        public string StepStatus { get; set; } = "Completed";
        public string? StepDetail { get; set; }
    }

    public async Task<ReplenishmentWorkflowResult> StartAsync(JsonElement objective, string initiatedBy, CancellationToken cancellationToken)
    {
        var workflowId = Guid.NewGuid();
        var state = new WorkflowStateDto
        {
            WorkflowId = workflowId,
            Objective = "Replenishment check",
            InitiatedBy = initiatedBy,
            CurrentStep = nameof(Step.Plan),
            ApprovalStatus = "NotRequired",
            Plan = PlanTemplate.Select((p, i) => new WorkflowPlanStepDto { StepIndex = i, Action = p.Action, Status = "Pending" }).ToList()
        };
        var run = new Run(state, new AgentWorkflowAudit { Id = workflowId, AgentName = AgentName, CreatedBy = initiatedBy })
        {
            Input = objective.ValueKind == JsonValueKind.Undefined ? null : objective.Clone()
        };

        if (!await TryCheckpointAsync(run, cancellationToken))
        {
            state.Errors.Add("The workflow trace could not be saved, so no agent was called.");
            run.Status = ReplenishmentWorkflowStatus.Failed;
            return BuildResult(run);
        }

        var step = Step.Plan;
        while (step is not (Step.AwaitHumanApproval or Step.Stop))
        {
            var planStep = PlanStepFor(run, step);
            state.CurrentStep = step.ToString();
            planStep.Status = "Running";
            planStep.StartedAtUtc = DateTime.UtcNow;
            run.StepStatus = "Completed";
            run.StepDetail = null;

            Step next;
            try
            {
                next = step switch
                {
                    Step.Plan => await PlanAsync(run, objective, cancellationToken),
                    Step.InventoryOptimization => await DelegateToInventoryOptimizationAsync(run),
                    Step.DemandForecast => await DelegateToDemandForecastAsync(run, cancellationToken),
                    Step.SupplierEvaluation => await DelegateToSupplierEvaluationAsync(run),
                    Step.ProcurementCoordinator => await DelegateToProcurementCoordinatorAsync(run, cancellationToken),
                    _ => Step.Stop
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Replenishment workflow {WorkflowId} failed at step {Step}", workflowId, step);
                state.Errors.Add($"{step} failed: {ex.Message}");
                run.Status = ReplenishmentWorkflowStatus.Failed;
                run.StepStatus = "Failed";
                run.StepDetail = ex.Message;
                next = Step.Stop;
            }

            planStep.Status = run.StepStatus;
            planStep.Detail = run.StepDetail;
            planStep.CompletedAtUtc = DateTime.UtcNow;
            await TryCheckpointAsync(run, CancellationToken.None);
            step = next;
        }

        foreach (var pending in state.Plan.Where(p => p.Status == "Pending"))
        {
            pending.Status = "Skipped";
        }

        if (step == Step.AwaitHumanApproval)
        {
            var approvalStep = PlanStepFor(run, Step.AwaitHumanApproval);
            approvalStep.Status = "Completed";
            approvalStep.Detail = run.NextAction;
            approvalStep.StartedAtUtc = approvalStep.CompletedAtUtc = DateTime.UtcNow;
            state.CurrentStep = nameof(Step.AwaitHumanApproval);
            state.ApprovalStatus = "PendingHumanApproval";
        }
        else
        {
            state.CurrentStep = run.Status is ReplenishmentWorkflowStatus.Failed or ReplenishmentWorkflowStatus.InvalidInput ? "Failed" : "Completed";
        }

        // The run's own output is checked against the orchestrator's published output contract.
        var result = BuildResult(run);
        var outputErrors = contracts.Validate(OutputContract, JsonSerializer.SerializeToElement(result, AgentJson.Options));
        Validation(run, "OutputMatchesContract", outputErrors.Count == 0,
            outputErrors.Count == 0 ? "Result matches workflow-output.schema.json." : string.Join("; ", outputErrors));

        await TryCheckpointAsync(run, CancellationToken.None);
        return result;
    }

    // ── Plan ─────────────────────────────────────────────────────────────────

    private async Task<Step> PlanAsync(Run run, JsonElement objective, CancellationToken cancellationToken)
    {
        var errors = objective.ValueKind == JsonValueKind.Object
            ? contracts.Validate(InputContract, objective)
            : ["The objective must be a JSON object."];
        Validation(run, "ObjectiveMatchesContract", errors.Count == 0,
            errors.Count == 0 ? "Objective matches workflow-input.schema.json." : string.Join("; ", errors));
        if (errors.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.InvalidInput, errors);
        }

        var input = objective.Deserialize<ReplenishmentObjective>(Web)!;
        run.Objective = input;

        run.Branch = await inventory.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.BranchId == input.BranchId, cancellationToken);
        run.Product = await inventory.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == input.ProductId, cancellationToken);
        var stock = await inventory.Inventories.AsNoTracking()
            .FirstOrDefaultAsync(i => i.BranchId == input.BranchId && i.ProductId == input.ProductId, cancellationToken);
        run.AvailableStock = stock?.AvailableQuantity ?? 0;

        var problems = new List<string>();
        if (run.Branch is not { IsActive: true }) problems.Add($"Branch {input.BranchId} does not exist or is inactive.");
        if (run.Product is not { IsActive: true }) problems.Add($"Product {input.ProductId} does not exist or is inactive.");
        Validation(run, "BranchAndProductExist", problems.Count == 0,
            problems.Count == 0 ? $"{run.Product!.SKU} at {run.Branch!.Name}; available stock {run.AvailableStock}." : string.Join(" ", problems));
        if (problems.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.InvalidInput, problems);
        }

        run.State.Objective = $"Replenishment check for {run.Product!.SKU} at {run.Branch!.Name}";
        run.StepDetail = run.State.Objective;
        return Step.InventoryOptimization;
    }

    // ── Delegate: Inventory Optimization Agent (S1) ──────────────────────────

    private async Task<Step> DelegateToInventoryOptimizationAsync(Run run)
    {
        var input = run.Objective!;
        var clock = Stopwatch.StartNew();

        // The agent analyses the whole branch and skips products that already have a pending recommendation,
        // so an existing pending recommendation for this product is the agent's current answer.
        var generated = await inventoryOptimizationAgent.GenerateRecommendationsAsync(input.BranchId);
        var recommendation = generated.FirstOrDefault(r => r.ProductId == input.ProductId);
        var reused = false;
        if (recommendation is null)
        {
            recommendation = (await inventoryOptimizationAgent.GetRecommendationsAsync(input.BranchId))
                .FirstOrDefault(r => r.ProductId == input.ProductId);
            reused = recommendation is not null;
        }

        Tool(run, "InventoryOptimizationAgent.GenerateRecommendations", clock,
            new { branchId = input.BranchId },
            recommendation is null
                ? new { recommendation = (object?)null, generatedForBranch = generated.Count }
                : new
                {
                    recommendationId = recommendation.RecommendationId,
                    type = recommendation.RecommendationType.ToString(),
                    issue = recommendation.IssueType.ToString(),
                    suggestedQuantity = recommendation.SuggestedQuantity,
                    sourceBranchId = recommendation.SourceBranchId,
                    reusedPendingRecommendation = reused,
                    reasoning = recommendation.Reasoning
                });

        if (recommendation is null)
        {
            run.NextAction = null;
            run.StepDetail = "No shortage: stock is above the reorder level.";
            return Stop(run, ReplenishmentWorkflowStatus.NoActionRequired);
        }

        run.Recommendation = recommendation;

        var problems = new List<string>();
        if (recommendation.ProductId != input.ProductId || recommendation.DestinationBranchId != input.BranchId)
            problems.Add("Recommendation is for a different product or branch.");
        if (recommendation.SuggestedQuantity is not > 0)
            problems.Add("Recommendation has no positive suggested quantity.");
        if (recommendation.RecommendationType is not (RecommendationType.Transfer or RecommendationType.Reorder))
            problems.Add($"Recommendation type {recommendation.RecommendationType} is not a replenishment action.");
        if (recommendation.RecommendationType == RecommendationType.Transfer && recommendation.SourceBranchId is null)
            problems.Add("Transfer recommendation has no source branch.");
        Validation(run, "InventoryRecommendationConsistent", problems.Count == 0,
            problems.Count == 0 ? $"{recommendation.RecommendationType} of {recommendation.SuggestedQuantity} ({recommendation.IssueType})." : string.Join(" ", problems));
        if (problems.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.Failed, problems);
        }

        if (recommendation.RecommendationType == RecommendationType.Transfer)
        {
            run.NextAction = $"Approve or reject transfer recommendation {recommendation.RecommendationId} in Inventory (POST /api/optimization/recommendations/{recommendation.RecommendationId}/approve).";
            run.StepDetail = $"Transfer of {recommendation.SuggestedQuantity} recommended from branch {recommendation.SourceBranchId}.";
            run.Status = ReplenishmentWorkflowStatus.TransferRecommended;
            return Step.AwaitHumanApproval;
        }

        run.StepDetail = $"Reorder recommended ({recommendation.IssueType}).";
        return Step.DemandForecast;
    }

    // ── Delegate: Demand Forecast Agent (S2) ─────────────────────────────────

    private async Task<Step> DelegateToDemandForecastAsync(Run run, CancellationToken cancellationToken)
    {
        var input = run.Objective!;
        var request = new DemandForecastWorkflowRequestDto
        {
            ProductId = run.Product!.Id,
            ProductSku = run.Product.SKU,
            ProductName = run.Product.Name,
            BranchId = run.Branch!.BranchId,
            BranchName = run.Branch.Name,
            ForecastDays = input.ForecastDays ?? 30,
            LeadTimeDays = input.LeadTimeDays ?? 7,
            CurrentStockLevel = run.AvailableStock,
            InitiatedBy = AgentName
        };

        var clock = Stopwatch.StartNew();
        var response = await demandForecastAgent.ExecuteForecastWorkflowAsync(request, cancellationToken);
        run.ForecastWorkflowId = response.WorkflowState.WorkflowId;
        run.ForecastReorderQuantity = response.Forecast?.RecommendedReorderQuantity;

        Tool(run, "DemandForecastAgent.ExecuteForecastWorkflow", clock,
            new { request.ProductId, request.BranchId, request.ForecastDays, request.LeadTimeDays, request.CurrentStockLevel },
            new
            {
                isSuccess = response.IsSuccess,
                forecastWorkflowId = response.WorkflowState.WorkflowId,
                recommendedReorderQuantity = response.Forecast?.RecommendedReorderQuantity,
                predictedTotalDemand = response.Forecast?.PredictedTotalDemand,
                recommendedSafetyStock = response.Forecast?.RecommendedSafetyStock,
                summary = response.SummaryMessage
            },
            response.IsSuccess ? null : response.SummaryMessage);

        var contractErrors = contracts.Validate(ForecastContract, JsonSerializer.SerializeToElement(response.WorkflowState));
        Validation(run, "ForecastMatchesContract", contractErrors.Count == 0,
            contractErrors.Count == 0 ? "Forecast workflow state matches demand-forecast-agent-contract.json." : string.Join("; ", contractErrors));
        if (contractErrors.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.Failed, contractErrors.Select(e => $"Demand Forecast Agent output: {e}"));
        }

        if (!response.IsSuccess || response.Forecast is null)
        {
            return Stop(run, ReplenishmentWorkflowStatus.Failed, [$"Demand Forecast Agent failed: {response.SummaryMessage}"]);
        }

        // D12: the forecast sizes the order. A reorder with no positive forecast quantity is a conflict between two
        // agents' conclusions, so it goes to a human instead of being resolved here.
        var quantity = (int)Math.Ceiling(response.Forecast.RecommendedReorderQuantity);
        var sized = quantity >= 1;
        Validation(run, "ForecastQuantityPositive", sized,
            $"Forecast reorder quantity {response.Forecast.RecommendedReorderQuantity}; Inventory shortage {run.Recommendation!.SuggestedQuantity}.");
        if (!sized)
        {
            run.NextAction = $"Inventory Optimization recommends a reorder but the forecast gives no order quantity. Decide the quantity and raise a proposal in Procurement (inventory recommendation {run.Recommendation.RecommendationId}, forecast {run.ForecastWorkflowId}).";
            run.StepDetail = "Forecast quantity below 1 (D12).";
            run.StepStatus = "Completed";
            run.Status = ReplenishmentWorkflowStatus.QuantityConflict;
            return Step.Stop;
        }

        run.OrderQuantity = quantity;
        run.StepDetail = $"Order quantity {quantity} (forecast), inventory shortage {run.Recommendation.SuggestedQuantity}.";
        return Step.SupplierEvaluation;
    }

    // ── Delegate: Supplier Evaluation Agent (S3) ─────────────────────────────

    private async Task<Step> DelegateToSupplierEvaluationAsync(Run run)
    {
        var productId = run.Objective!.ProductId;
        var clock = Stopwatch.StartNew();
        var evaluation = await supplierEvaluationAgent.EvaluateQuotationsAsync(productId);

        Tool(run, "SupplierEvaluationAgent.EvaluateQuotations", clock,
            new { productId },
            new
            {
                decisionStatus = evaluation.DecisionStatus,
                selectedSupplierId = evaluation.SelectedSupplierId,
                selectedQuotationId = evaluation.SelectedQuotationId,
                reasonSummary = evaluation.ReasonSummary,
                eligibleCandidates = evaluation.EligibleCandidates.Count,
                evaluated = evaluation.AllEvaluations.Count
            });

        if (evaluation.SelectedSupplierId is null || evaluation.SelectedQuotationId is null)
        {
            run.NextAction = $"No eligible quotation for product {productId}. Request quotations in Supplier Management.";
            run.StepDetail = $"Supplier Evaluation decision: {evaluation.DecisionStatus}.";
            run.StepStatus = "Completed";
            run.Status = ReplenishmentWorkflowStatus.NoEligibleSupplier;
            return Step.Stop;
        }

        var agentOutput = JsonSerializer.SerializeToElement(new
        {
            decisionStatus = evaluation.DecisionStatus,
            selectedSupplierId = evaluation.SelectedSupplierId,
            selectedQuotationId = evaluation.SelectedQuotationId,
            reasonSummary = evaluation.ReasonSummary,
            humanApprovalRequired = evaluation.HumanApprovalRequired
        });
        var problems = contracts.Validate(SupplierEvaluationContract, agentOutput).ToList();
        if (!evaluation.EligibleCandidates.Any(c => c.QuotationId == evaluation.SelectedQuotationId && c.SupplierId == evaluation.SelectedSupplierId))
        {
            problems.Add("The selected quotation is not one of the eligible candidates the agent was given.");
        }

        Validation(run, "SupplierSelectionMatchesContract", problems.Count == 0,
            problems.Count == 0 ? $"Selected quotation {evaluation.SelectedQuotationId}: {evaluation.ReasonSummary}" : string.Join("; ", problems));
        if (problems.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.Failed, problems.Select(e => $"Supplier Evaluation Agent output: {e}"));
        }

        run.SelectedSupplierId = evaluation.SelectedSupplierId;
        run.SelectedQuotationId = evaluation.SelectedQuotationId;
        run.StepDetail = evaluation.ReasonSummary;
        return Step.ProcurementCoordinator;
    }

    // ── Delegate: Procurement Coordinator Agent (S4) ─────────────────────────

    private async Task<Step> DelegateToProcurementCoordinatorAsync(Run run, CancellationToken cancellationToken)
    {
        var objective = JsonSerializer.SerializeToElement(new
        {
            triggerType = run.Recommendation!.IssueType == IssueType.OutOfStock ? "OutOfStock" : "LowStock",
            productId = run.Objective!.ProductId,
            branchId = run.Objective.BranchId,
            suggestedQuantity = run.OrderQuantity!.Value,
            candidateSupplierId = run.SelectedSupplierId!.Value,
            quotationId = run.SelectedQuotationId!.Value,
            sourceAgent = "DemandForecastAgent" // D12: the quantity comes from the forecast
        });

        var errors = procurementSchemas.Validate(ProcurementCoordinatorAgent.InputSchema, objective);
        Validation(run, "ProcurementObjectiveMatchesContract", errors.Count == 0,
            errors.Count == 0 ? "Hand-off matches procurement-coordinator/workflow-input.schema.json." : string.Join("; ", errors));
        if (errors.Count > 0)
        {
            return Stop(run, ReplenishmentWorkflowStatus.Failed, errors.Select(e => $"Procurement Coordinator hand-off: {e}"));
        }

        var clock = Stopwatch.StartNew();
        var result = await procurementCoordinatorAgent.StartAsync(objective, run.State.InitiatedBy, cancellationToken);
        run.ProcurementWorkflowId = result.WorkflowId;
        run.ProposalId = result.ProposalId;

        Tool(run, "ProcurementCoordinatorAgent.Start", clock, objective,
            new { procurementWorkflowId = result.WorkflowId, status = result.Status, proposalId = result.ProposalId, budgetCheck = result.BudgetCheck, errors = result.Errors },
            result.Status == ProcurementWorkflowStatus.PendingApproval ? null : result.Status);

        switch (result.Status)
        {
            case ProcurementWorkflowStatus.PendingApproval:
                run.NextAction = $"Approve or reject proposal {result.ProposalId} (POST /api/agent-workflows/{result.WorkflowId}/approve, or the Procurement approvals screen on web or mobile).";
                run.StepDetail = $"Proposal {result.ProposalId} created, PendingApproval.";
                run.Status = ReplenishmentWorkflowStatus.PendingApproval;
                return Step.AwaitHumanApproval;

            case ProcurementWorkflowStatus.ChecksFailed:
                run.NextAction = "Review the failed budget or business-rule checks in the Procurement Coordinator trace.";
                run.StepDetail = "Budget or business-rule checks failed; no proposal was created.";
                run.StepStatus = "Completed";
                run.State.Errors.AddRange(result.Errors);
                run.Status = ReplenishmentWorkflowStatus.ChecksFailed;
                return Step.Stop;

            default:
                return Stop(run, ReplenishmentWorkflowStatus.Failed,
                    result.Errors.Count > 0 ? result.Errors : [$"Procurement Coordinator Agent returned {result.Status}."]);
        }
    }

    // ── Read back ────────────────────────────────────────────────────────────

    public async Task<ReplenishmentWorkflowDetail?> GetWorkflowAsync(Guid workflowId, CancellationToken cancellationToken)
    {
        var audit = await traceStore.FindAsync(workflowId, AgentName, cancellationToken);
        if (audit is null)
        {
            return null;
        }

        var record = Deserialize<ReplenishmentWorkflowRecord>(audit.FinalOutcomeJson);
        string? liveProposalStatus = null;
        if (record?.Result.ChildWorkflows.ProcurementWorkflowId is { } procurementWorkflowId)
        {
            liveProposalStatus = (await procurementCoordinatorAgent.GetWorkflowAsync(procurementWorkflowId, cancellationToken))?.ProposalStatus;
        }

        return new ReplenishmentWorkflowDetail(
            audit.Id,
            audit.Objective,
            audit.InitiatedBy,
            audit.CurrentStep,
            audit.ApprovalStatus,
            audit.CreatedAtUtc,
            audit.UpdatedAtUtc,
            audit.ExecutionDurationMs,
            record?.Result,
            liveProposalStatus,
            Deserialize<List<WorkflowPlanStepDto>>(audit.PlanJson) ?? [],
            Deserialize<List<ToolExecutionDto>>(audit.ToolExecutionsJson) ?? [],
            Deserialize<List<ValidationResultDto>>(audit.ValidationResultsJson) ?? [],
            Deserialize<List<string>>(audit.ErrorsJson) ?? []);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Step Stop(Run run, string status, IEnumerable<string>? errors = null)
    {
        if (errors is not null)
        {
            run.State.Errors.AddRange(errors);
        }

        run.Status = status;
        run.StepStatus = status is ReplenishmentWorkflowStatus.Failed or ReplenishmentWorkflowStatus.InvalidInput ? "Failed" : "Completed";
        run.StepDetail ??= run.State.Errors.LastOrDefault();
        return Step.Stop;
    }

    private static WorkflowPlanStepDto PlanStepFor(Run run, Step step) =>
        run.State.Plan[Array.FindIndex(PlanTemplate, p => p.Step == step)];

    private static void Validation(Run run, string rule, bool passed, string details) =>
        run.State.ValidationResults.Add(new ValidationResultDto { Rule = rule, Passed = passed, Details = details });

    private static void Tool(Run run, string name, Stopwatch clock, object input, object output, string? error = null) =>
        run.State.ToolExecutions.Add(new ToolExecutionDto
        {
            ToolName = name,
            InputParameters = input,
            OutputPayload = output,
            ExecutedAtUtc = DateTime.UtcNow,
            DurationMs = (int)clock.ElapsedMilliseconds,
            IsSuccess = error is null,
            ErrorMessage = error,
            Attempts = 1
        });

    private static ReplenishmentWorkflowResult BuildResult(Run run)
    {
        var recommendation = run.Recommendation;
        var decision = recommendation?.RecommendationType switch
        {
            RecommendationType.Transfer => "Transfer",
            RecommendationType.Reorder => "Reorder",
            _ => run.Status == ReplenishmentWorkflowStatus.NoActionRequired ? "None" : null
        };

        return new ReplenishmentWorkflowResult(
            run.State.WorkflowId,
            run.Status,
            run.Objective?.BranchId ?? Guid.Empty,
            run.Objective?.ProductId ?? Guid.Empty,
            decision,
            run.OrderQuantity,
            run.ForecastReorderQuantity,
            recommendation?.SuggestedQuantity,
            run.SelectedSupplierId,
            run.SelectedQuotationId,
            run.ProposalId,
            run.Status is ReplenishmentWorkflowStatus.PendingApproval or ReplenishmentWorkflowStatus.TransferRecommended
                or ReplenishmentWorkflowStatus.QuantityConflict,
            run.NextAction,
            new ReplenishmentChildWorkflows(recommendation?.RecommendationId, run.ForecastWorkflowId, run.ProcurementWorkflowId),
            run.State.Errors.ToList());
    }

    private async Task<bool> TryCheckpointAsync(Run run, CancellationToken cancellationToken)
    {
        var state = run.State;
        var audit = run.Audit;
        var result = BuildResult(run);

        audit.Objective = state.Objective.Length > 500 ? state.Objective[..500] : state.Objective;
        audit.InitiatedBy = state.InitiatedBy;
        audit.CurrentStep = state.CurrentStep;
        audit.PlanJson = JsonSerializer.Serialize(state.Plan);
        audit.ToolExecutionsJson = JsonSerializer.Serialize(state.ToolExecutions);
        audit.ValidationResultsJson = JsonSerializer.Serialize(state.ValidationResults);
        audit.ErrorsJson = JsonSerializer.Serialize(state.Errors);
        audit.FinalOutcomeJson = JsonSerializer.Serialize(new ReplenishmentWorkflowRecord(run.Input, result), AgentJson.Options);
        audit.RetryCount = state.RetryCount;
        audit.ApprovalStatus = state.ApprovalStatus;
        audit.ExecutionDurationMs = run.Clock.ElapsedMilliseconds;
        audit.IsSuccess = result.Status is not (ReplenishmentWorkflowStatus.Failed or ReplenishmentWorkflowStatus.InvalidInput);

        try
        {
            await traceStore.SaveAsync(audit, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not persist trace for replenishment workflow {WorkflowId} at step {Step}", state.WorkflowId, state.CurrentStep);
            return false;
        }
    }

    private static T? Deserialize<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json, AgentJson.Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
