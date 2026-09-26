using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Narrative;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Safety;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator;

public interface IProcurementCoordinatorAgent
{
    /// <summary>
    /// Runs the workflow for one reorder signal. Never throws for bad input or tool failures: those
    /// come back as a result with status InvalidInput/ChecksFailed/Failed, and are recorded in the trace.
    /// </summary>
    Task<ProcurementWorkflowResult> StartAsync(JsonElement objective, string initiatedBy, CancellationToken cancellationToken);

    Task<ProcurementWorkflowDetailResponse?> GetWorkflowAsync(Guid workflowId, CancellationToken cancellationToken);

    /// <summary>Records on the trace that a human decided on the workflow's proposal.</summary>
    Task RecordHumanDecisionAsync(Guid workflowId, string decision, string decidedBy, CancellationToken cancellationToken);
}

/// <summary>
/// Procurement Coordinator Agent. Turns a reorder signal plus a chosen supplier quotation into a
/// ProcurementProposal awaiting human approval, and stops there.
///
/// The workflow is a fixed graph of nodes with conditional edges (see <see cref="Node"/>); no model
/// decides which step runs next or which tool is called. All numbers come from the quotation or
/// from code, tools are reached only through <see cref="AgentToolGateway"/>, and state is
/// checkpointed to AgentWorkflowAudits after every node.
/// </summary>
public class ProcurementCoordinatorAgent(
    AgentToolGateway tools,
    IAgentSchemaValidator schemas,
    IProductCatalogService products,
    ISupplierDirectoryService suppliers,
    IProcurementProposalService proposals,
    IProposalJustificationWriter justificationWriter,
    IAgentWorkflowTraceStore traceStore,
    IOptions<ProcurementAgentOptions> options,
    ILogger<ProcurementCoordinatorAgent> logger) : IProcurementCoordinatorAgent
{
    public const string AgentName = "ProcurementCoordinatorAgent";
    public const string InputSchema = "workflow-input.schema.json";
    public const string RunningStatus = "Running";

    private const int MaxRecordedPayloadLength = 4000;

    /// <summary>Workflow nodes in execution order. <see cref="AwaitHumanApproval"/> and <see cref="Stop"/> are terminal.</summary>
    private enum Node
    {
        ValidateInput,
        LoadQuotationContext,
        ScreenUntrustedContent,
        BuildPurchasingPlan,
        CheckBudget,
        ValidateBusinessRules,
        EvaluateGate,
        DraftJustification,
        CreateProposal,
        AwaitHumanApproval,
        Stop
    }

    private static readonly Node[] PlannedNodes = Enum.GetValues<Node>().Where(n => n != Node.Stop).ToArray();

    public async Task<ProcurementWorkflowResult> StartAsync(JsonElement objective, string initiatedBy, CancellationToken cancellationToken)
    {
        var workflowId = Guid.NewGuid();
        var state = new WorkflowStateDto
        {
            WorkflowId = workflowId,
            Objective = "Procurement coordination request (objective not yet validated).",
            InitiatedBy = Truncate(initiatedBy, 100),
            CurrentStep = nameof(Node.ValidateInput),
            Plan = PlannedNodes.Select((n, i) => new WorkflowPlanStepDto { StepIndex = i + 1, Action = n.ToString() }).ToList(),
            ApprovalStatus = "NotRequired"
        };
        var run = new Run(state, new AgentWorkflowAudit { Id = workflowId, AgentName = AgentName, CreatedBy = state.InitiatedBy });

        // No step may run unless the run is on record.
        if (!await TryCheckpointAsync(run, cancellationToken))
        {
            state.Errors.Add("The workflow trace could not be saved, so nothing was executed.");
            run.Status = ProcurementWorkflowStatus.Failed;
            return BuildResult(run);
        }

        var node = Node.ValidateInput;
        while (node is not (Node.AwaitHumanApproval or Node.Stop))
        {
            var step = StepFor(run, node);
            state.CurrentStep = node.ToString();
            step.Status = "Running";
            step.StartedAtUtc = DateTime.UtcNow;
            run.StepStatus = "Completed";
            run.StepDetail = null;

            Node next;
            try
            {
                next = await ExecuteNodeAsync(node, run, objective, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                next = FailRun(run, "The request was cancelled before the workflow finished.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Procurement workflow {WorkflowId} failed unexpectedly in step {Step}", workflowId, node);
                next = FailRun(run, $"Unexpected error in step {node}: {ex.GetType().Name} (details logged server-side).");
            }

            step.Status = run.StepStatus;
            step.Detail = run.StepDetail;
            step.CompletedAtUtc = DateTime.UtcNow;

            var saved = await TryCheckpointAsync(run, CancellationToken.None);
            if (!saved && next == Node.CreateProposal)
            {
                next = FailRun(run, "The workflow trace could not be saved, so no proposal was created: every agent write must be auditable.");
            }

            node = next;
        }

        if (node == Node.AwaitHumanApproval)
        {
            var waiting = StepFor(run, Node.AwaitHumanApproval);
            waiting.Status = "Waiting";
            waiting.StartedAtUtc = DateTime.UtcNow;
            waiting.Detail = $"Proposal {run.ProposalId} is PendingApproval. The agent has stopped; only a human reviewer can approve it.";
            state.CurrentStep = nameof(Node.AwaitHumanApproval);
            state.ApprovalStatus = "PendingApproval";
            run.Status = ProcurementWorkflowStatus.PendingApproval;
        }
        else
        {
            state.CurrentStep = "Stopped";
        }

        foreach (var pending in state.Plan.Where(s => s.Status == "Pending"))
        {
            pending.Status = "Skipped";
        }

        var result = BuildResult(run);
        if (!await TryCheckpointAsync(run, CancellationToken.None))
        {
            result = result with { Errors = [.. result.Errors, "The final workflow trace could not be saved; see server logs."] };
        }

        logger.LogInformation(
            "Procurement workflow {WorkflowId} finished with status {Status}, proposal {ProposalId}, {ToolCalls} tool call(s), {Retries} retries",
            workflowId, result.Status, result.ProposalId, state.ToolExecutions.Count, state.RetryCount);

        return result;
    }

    public async Task<ProcurementWorkflowDetailResponse?> GetWorkflowAsync(Guid workflowId, CancellationToken cancellationToken)
    {
        var audit = await traceStore.FindAsync(workflowId, AgentName, cancellationToken);
        if (audit is null)
        {
            return null;
        }

        var record = Deserialize<ProcurementWorkflowRecord>(audit.FinalOutcomeJson);
        var proposalId = record?.Result.ProposalId;
        string? proposalStatus = null;
        if (proposalId is { } id)
        {
            try
            {
                proposalStatus = (await proposals.GetByIdAsync(id, cancellationToken)).Status.ToString();
            }
            catch (ProcurementNotFoundException)
            {
                proposalStatus = "NotFound";
            }
        }

        return new ProcurementWorkflowDetailResponse(
            audit.Id,
            audit.AgentName,
            audit.Objective,
            audit.InitiatedBy,
            record?.Result.Status ?? (audit.IsSuccess ? RunningStatus : ProcurementWorkflowStatus.Failed),
            audit.CurrentStep,
            audit.ApprovalStatus,
            proposalId,
            proposalStatus,
            audit.CreatedAtUtc,
            audit.UpdatedAtUtc,
            audit.ExecutionDurationMs,
            audit.RetryCount,
            record?.Result,
            record?.Plan,
            record?.Justification,
            Deserialize<List<WorkflowPlanStepDto>>(audit.PlanJson) ?? [],
            Deserialize<List<ToolExecutionDto>>(audit.ToolExecutionsJson) ?? [],
            Deserialize<List<ValidationResultDto>>(audit.ValidationResultsJson) ?? [],
            Deserialize<List<string>>(audit.ErrorsJson) ?? []);
    }

    public async Task RecordHumanDecisionAsync(Guid workflowId, string decision, string decidedBy, CancellationToken cancellationToken)
    {
        var audit = await traceStore.FindAsync(workflowId, AgentName, cancellationToken);
        if (audit is null)
        {
            return;
        }

        var steps = Deserialize<List<WorkflowPlanStepDto>>(audit.PlanJson) ?? [];
        var gate = steps.FirstOrDefault(s => s.Action == nameof(Node.AwaitHumanApproval));
        if (gate is not null)
        {
            gate.Status = "Completed";
            gate.CompletedAtUtc = DateTime.UtcNow;
            gate.Detail = $"{decision} by user {decidedBy}.";
        }

        audit.PlanJson = JsonSerializer.Serialize(steps);
        audit.ApprovalStatus = decision;
        audit.CurrentStep = "HumanDecisionRecorded";
        audit.UpdatedBy = Truncate(decidedBy, 100);
        await traceStore.SaveAsync(audit, cancellationToken);
    }

    private Task<Node> ExecuteNodeAsync(Node node, Run run, JsonElement objective, CancellationToken cancellationToken) => node switch
    {
        Node.ValidateInput => Task.FromResult(ValidateInput(run, objective)),
        Node.LoadQuotationContext => LoadQuotationContextAsync(run, cancellationToken),
        Node.ScreenUntrustedContent => Task.FromResult(ScreenUntrustedContent(run)),
        Node.BuildPurchasingPlan => Task.FromResult(BuildPurchasingPlan(run)),
        Node.CheckBudget => CheckBudgetAsync(run, cancellationToken),
        Node.ValidateBusinessRules => ValidateBusinessRulesAsync(run, cancellationToken),
        Node.EvaluateGate => Task.FromResult(EvaluateGate(run)),
        Node.DraftJustification => DraftJustificationAsync(run, cancellationToken),
        Node.CreateProposal => CreateProposalAsync(run, cancellationToken),
        _ => throw new InvalidOperationException($"Node {node} has no handler.")
    };

    private Node ValidateInput(Run run, JsonElement objective)
    {
        var errors = objective.ValueKind == JsonValueKind.Undefined
            ? ["Request body is missing."]
            : schemas.Validate(InputSchema, objective);

        if (errors.Count > 0)
        {
            var raw = objective.ValueKind == JsonValueKind.Undefined ? "" : objective.GetRawText();
            run.Input = JsonSerializer.SerializeToElement(Truncate(raw, MaxRecordedPayloadLength));
            run.State.ValidationResults.Add(new ValidationResultDto { Rule = "InputSchema", Passed = false, Details = Truncate(string.Join("; ", errors), 1000) });
            run.State.Errors.AddRange(errors.Select(e => $"Invalid input: {e}"));
            run.Status = ProcurementWorkflowStatus.InvalidInput;
            run.StepStatus = "Failed";
            run.StepDetail = "Objective payload rejected by workflow-input.schema.json; no tool was called.";
            return Node.Stop;
        }

        run.Input = objective.Clone();
        var request = objective.Deserialize<ProcurementWorkflowStartRequest>(AgentJson.Options)!;
        run.Request = request;
        run.State.ValidationResults.Add(new ValidationResultDto { Rule = "InputSchema", Passed = true, Details = "Objective payload matches workflow-input.schema.json." });
        run.State.Objective =
            $"Replenish product {request.ProductId} at branch {request.BranchId}: propose {request.SuggestedQuantity} units from supplier " +
            $"{request.CandidateSupplierId} (quotation {request.QuotationId}). Trigger {request.TriggerType} from {request.SourceAgent}.";
        return Node.LoadQuotationContext;
    }

    /// <summary>Reads the quotation, product and supplier the plan is priced from. Internal reads, not agent tools.</summary>
    private async Task<Node> LoadQuotationContextAsync(Run run, CancellationToken cancellationToken)
    {
        var request = run.Request!;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(options.Value.ToolTimeout);

        run.Quotation = await suppliers.GetQuotationAsync(request.QuotationId, timeout.Token);
        run.Product = await products.GetProductAsync(request.ProductId, timeout.Token);
        run.Supplier = await suppliers.GetSupplierAsync(request.CandidateSupplierId, timeout.Token);

        run.StepDetail = $"Quotation {(run.Quotation is null ? "not found" : "found")}, product {(run.Product is null ? "not found" : "found")}, " +
                         $"supplier {(run.Supplier is null ? "not found" : "found")}.";
        return Node.ScreenUntrustedContent;
    }

    private static Node ScreenUntrustedContent(Run run)
    {
        var request = run.Request!;
        var screens = new[]
        {
            UntrustedContentScreen.Screen("quotation.notes", run.Quotation?.Notes),
            UntrustedContentScreen.Screen("product.name", run.Product?.Name),
            UntrustedContentScreen.Screen("supplier.name", run.Supplier?.Name)
        };
        var flagged = screens.Where(s => s.Flagged).ToList();
        bool IsFlagged(string field) => flagged.Any(s => s.Field == field);

        run.UntrustedContentWithheld = flagged.Count > 0;
        run.ProductLabel = run.Product is null || IsFlagged("product.name") ? $"product {request.ProductId}" : Truncate(run.Product.Name, 120);
        run.SupplierLabel = run.Supplier is null || IsFlagged("supplier.name") ? $"supplier {request.CandidateSupplierId}" : Truncate(run.Supplier.Name, 120);

        run.State.ValidationResults.Add(new ValidationResultDto
        {
            Rule = "UntrustedContentScreening",
            Passed = flagged.Count == 0,
            Details = flagged.Count == 0
                ? "No instruction-like content found in supplier-provided text."
                : $"Instruction-like content found in {string.Join(", ", flagged.Select(s => $"{s.Field} [{string.Join(", ", s.Indicators)}]"))}. " +
                  "It was treated as data only: withheld from the justification and any LLM prompt, and it did not change the plan, the tool arguments or the workflow path."
        });
        run.StepDetail = flagged.Count == 0 ? "Nothing flagged." : $"{flagged.Count} field(s) flagged and withheld.";
        return Node.BuildPurchasingPlan;
    }

    private static Node BuildPurchasingPlan(Run run)
    {
        var request = run.Request!;
        var quotation = run.Quotation;
        var priced = quotation is not null
                     && quotation.SupplierId == request.CandidateSupplierId
                     && quotation.ProductId == request.ProductId
                     && quotation.UnitPrice is > 0m;

        if (!priced)
        {
            run.State.Errors.Add(
                $"Cannot price the plan: quotation {request.QuotationId} was not found, belongs to another supplier, or has no price for product {request.ProductId}.");
            run.StepStatus = "Failed";
            run.StepDetail = "Plan could not be priced. Business rules still run so every problem is reported.";
            return Node.CheckBudget;
        }

        var unitPrice = quotation!.UnitPrice!.Value;
        var lineTotal = request.SuggestedQuantity * unitPrice;
        run.UnitPrice = unitPrice;
        run.Plan = new PurchasingPlan(
            request.BranchId,
            request.CandidateSupplierId,
            run.SupplierLabel,
            request.QuotationId,
            [new PurchasingPlanLine(request.ProductId, run.ProductLabel, request.SuggestedQuantity, unitPrice, lineTotal)],
            lineTotal);
        run.StepDetail = $"{request.SuggestedQuantity} x {unitPrice:0.00} (quoted) = {lineTotal:0.00}.";
        return Node.CheckBudget;
    }

    private async Task<Node> CheckBudgetAsync(Run run, CancellationToken cancellationToken)
    {
        if (run.Plan is null)
        {
            run.StepStatus = "Skipped";
            run.StepDetail = "No priced plan to check against the budget.";
            return Node.ValidateBusinessRules;
        }

        // The budget active today: the same budget ProcurementProposalService checks when the proposal is created.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var call = await tools.InvokeAsync<CheckBudgetOutput>(
            CheckBudgetTool.ToolName,
            new CheckBudgetInput(run.Request!.BranchId, today, today, run.Plan.TotalCost),
            run.State,
            cancellationToken);
        if (!call.Succeeded)
        {
            return ToolFailed(run, CheckBudgetTool.ToolName, call.Error);
        }

        var budget = call.Output!;
        run.Budget = budget;
        run.State.ValidationResults.Add(new ValidationResultDto
        {
            Rule = "BudgetAvailable",
            Passed = budget.Allowed,
            Details = budget.Reason ?? $"Plan total {run.Plan.TotalCost:0.00} fits the remaining budget of {budget.Remaining:0.00}."
        });
        run.StepDetail = budget.Allowed ? "Within budget." : "Over budget or no budget.";
        return Node.ValidateBusinessRules;
    }

    private async Task<Node> ValidateBusinessRulesAsync(Run run, CancellationToken cancellationToken)
    {
        var request = run.Request!;
        var call = await tools.InvokeAsync<ValidateBusinessRulesOutput>(
            ValidateBusinessRulesTool.ToolName,
            new ValidateBusinessRulesInput(
                request.BranchId, request.CandidateSupplierId, request.QuotationId, request.ProductId, request.SuggestedQuantity, run.UnitPrice ?? 0m),
            run.State,
            cancellationToken);
        if (!call.Succeeded)
        {
            return ToolFailed(run, ValidateBusinessRulesTool.ToolName, call.Error);
        }

        run.Rules = call.Output!;
        run.State.ValidationResults.AddRange(run.Rules.Results.Select(r => new ValidationResultDto { Rule = r.Rule, Passed = r.Passed, Details = r.Details }));
        run.StepDetail = $"{run.Rules.Results.Count(r => r.Passed)}/{run.Rules.Results.Count} rules passed.";
        return Node.EvaluateGate;
    }

    private static Node EvaluateGate(Run run)
    {
        var reasons = new List<string>();
        if (run.Plan is null)
        {
            reasons.Add("the plan could not be priced");
        }

        if (run.Budget is { Allowed: false } budget)
        {
            reasons.Add($"budget check failed ({budget.Reason})");
        }

        if (run.Rules is { Passed: false } rules)
        {
            reasons.Add($"business rules failed ({string.Join(", ", rules.Results.Where(r => !r.Passed).Select(r => r.Rule))})");
        }

        if (reasons.Count > 0)
        {
            run.State.Errors.AddRange(reasons.Select(r => $"Checks failed: {r}."));
            run.Status = ProcurementWorkflowStatus.ChecksFailed;
            run.StepStatus = "Failed";
            run.StepDetail = "Not creating a proposal: " + string.Join("; ", reasons) + ".";
            return Node.Stop;
        }

        run.StepDetail = "Budget and all business rules passed.";
        return Node.DraftJustification;
    }

    private async Task<Node> DraftJustificationAsync(Run run, CancellationToken cancellationToken)
    {
        var request = run.Request!;
        var facts = new JustificationFacts(
            request.TriggerType,
            request.SourceAgent,
            run.ProductLabel,
            run.SupplierLabel,
            request.SuggestedQuantity,
            run.UnitPrice!.Value,
            run.Plan!.TotalCost,
            run.Budget!.Remaining,
            run.UntrustedContentWithheld);

        run.Justification = await justificationWriter.WriteAsync(facts, cancellationToken);
        if (run.Justification.Note is { } note)
        {
            run.State.ValidationResults.Add(new ValidationResultDto
            {
                Rule = "LlmJustificationGrounding",
                Passed = false,
                Details = $"{note} The deterministic template was used instead."
            });
        }
        else if (run.Justification.Source == "LLM")
        {
            run.State.ValidationResults.Add(new ValidationResultDto
            {
                Rule = "LlmJustificationGrounding",
                Passed = true,
                Details = "Every number in the LLM draft appears in the plan."
            });
        }

        run.StepDetail = $"Justification written by {run.Justification.Source}.";
        return Node.CreateProposal;
    }

    private async Task<Node> CreateProposalAsync(Run run, CancellationToken cancellationToken)
    {
        var request = run.Request!;
        var call = await tools.InvokeAsync<CreateProposalOutput>(
            CreateProposalTool.ToolName,
            new CreateProposalInput(
                request.BranchId,
                request.CandidateSupplierId,
                request.QuotationId,
                request.ProductId,
                request.SuggestedQuantity,
                run.UnitPrice!.Value,
                Truncate(run.Justification!.Text, 2000)),
            run.State,
            cancellationToken);
        if (!call.Succeeded)
        {
            return ToolFailed(run, CreateProposalTool.ToolName, call.Error);
        }

        run.ProposalId = call.Output!.ProposalId;
        run.StepDetail = $"Proposal {run.ProposalId} created with status {call.Output.Status}.";
        return Node.AwaitHumanApproval;
    }

    private static Node ToolFailed(Run run, string toolName, string? error) =>
        FailRun(run, $"{toolName} failed: {error}");

    private static Node FailRun(Run run, string error)
    {
        run.State.Errors.Add(error);
        run.Status = ProcurementWorkflowStatus.Failed;
        run.StepStatus = "Failed";
        run.StepDetail = error;
        return Node.Stop;
    }

    private static WorkflowPlanStepDto StepFor(Run run, Node node) =>
        run.State.Plan.First(s => s.Action == node.ToString());

    private static ProcurementWorkflowResult BuildResult(Run run) => new(
        run.State.WorkflowId,
        run.ProposalId,
        run.Status,
        run.Budget is { } b ? new BudgetCheckSummary(b.Allocated, b.Spent, b.Remaining, b.Allowed) : null,
        run.Rules?.Results ?? [],
        run.State.Errors.ToList());

    private async Task<bool> TryCheckpointAsync(Run run, CancellationToken cancellationToken)
    {
        var state = run.State;
        var audit = run.Audit;
        var result = BuildResult(run);

        audit.Objective = Truncate(state.Objective, 500);
        audit.InitiatedBy = state.InitiatedBy;
        audit.CurrentStep = state.CurrentStep;
        audit.PlanJson = JsonSerializer.Serialize(state.Plan);
        audit.ToolExecutionsJson = JsonSerializer.Serialize(state.ToolExecutions);
        audit.ValidationResultsJson = JsonSerializer.Serialize(state.ValidationResults);
        audit.ErrorsJson = JsonSerializer.Serialize(state.Errors);
        audit.FinalOutcomeJson = JsonSerializer.Serialize(
            new ProcurementWorkflowRecord(run.Input, run.Plan, run.Justification?.Text, run.Justification?.Source, result),
            AgentJson.Options);
        audit.RetryCount = state.RetryCount;
        audit.ApprovalStatus = state.ApprovalStatus;
        audit.ExecutionDurationMs = run.Clock.ElapsedMilliseconds;
        audit.IsSuccess = result.Status is ProcurementWorkflowStatus.PendingApproval or RunningStatus;

        try
        {
            await traceStore.SaveAsync(audit, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Could not persist trace for procurement workflow {WorkflowId} at step {Step}", state.WorkflowId, state.CurrentStep);
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

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    /// <summary>Mutable state of a single run, passed between nodes.</summary>
    private sealed class Run(WorkflowStateDto state, AgentWorkflowAudit audit)
    {
        public WorkflowStateDto State { get; } = state;
        public AgentWorkflowAudit Audit { get; } = audit;
        public Stopwatch Clock { get; } = Stopwatch.StartNew();

        public string Status { get; set; } = RunningStatus;
        public string StepStatus { get; set; } = "Completed";
        public string? StepDetail { get; set; }

        public JsonElement? Input { get; set; }
        public ProcurementWorkflowStartRequest? Request { get; set; }
        public SupplierQuotationInfo? Quotation { get; set; }
        public ProductInfo? Product { get; set; }
        public SupplierInfo? Supplier { get; set; }
        public string ProductLabel { get; set; } = "";
        public string SupplierLabel { get; set; } = "";
        public bool UntrustedContentWithheld { get; set; }
        public decimal? UnitPrice { get; set; }
        public PurchasingPlan? Plan { get; set; }
        public CheckBudgetOutput? Budget { get; set; }
        public ValidateBusinessRulesOutput? Rules { get; set; }
        public JustificationDraft? Justification { get; set; }
        public Guid? ProposalId { get; set; }
    }
}
