using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPilot.API.Controllers;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.AgenticAI.DemandForecastAgent;
using StockPilot.Shared.Agents.Orchestrator;
using StockPilot.Application.AgenticAI.ProcurementCoordinator;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Models;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Domain.Enums;
using StockPilot.Infrastructure.Data;
using StockPilot.Procurement.Application.Dtos.Rules;
using Xunit;

namespace StockPilot.Api.Tests;

/// <summary>
/// Replenishment Orchestrator: routing between the four agents, the D11/D12 hand-offs, contract validation
/// and the trace. The agents are fakes; the contract validators and contract files are the real ones.
/// </summary>
public class ReplenishmentOrchestratorTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid SourceBranch = Guid.NewGuid();
    private static readonly Guid Product = Guid.NewGuid();
    private static readonly Guid Supplier = Guid.NewGuid();
    private static readonly Guid Quotation = Guid.NewGuid();
    private static readonly Guid ForecastWorkflow = Guid.NewGuid();
    private static readonly Guid ProcurementWorkflow = Guid.NewGuid();
    private static readonly Guid Proposal = Guid.NewGuid();

    private readonly Mock<IInventoryOptimizationService> _inventoryAgent = new(MockBehavior.Strict);
    private readonly Mock<IDemandForecastAgent> _forecastAgent = new(MockBehavior.Strict);
    private readonly Mock<ISupplierEvaluationService> _supplierAgent = new(MockBehavior.Strict);
    private readonly Mock<IProcurementCoordinatorAgent> _procurementAgent = new(MockBehavior.Strict);
    private readonly InMemoryTraceStore _traces = new();
    private JsonElement? _procurementObjective;

    private sealed class InMemoryTraceStore : IAgentWorkflowTraceStore
    {
        public Dictionary<Guid, AgentWorkflowAudit> Rows { get; } = new();
        public int Saves { get; private set; }

        public Task SaveAsync(AgentWorkflowAudit audit, CancellationToken cancellationToken)
        {
            Rows[audit.Id] = audit;
            Saves++;
            return Task.CompletedTask;
        }

        public Task<AgentWorkflowAudit?> FindAsync(Guid workflowId, string agentName, CancellationToken cancellationToken) =>
            Task.FromResult(Rows.TryGetValue(workflowId, out var a) && a.AgentName == agentName ? a : null);
    }

    private ReplenishmentOrchestrator NewOrchestrator(bool productActive = true)
    {
        var db = new StockPilotDbContext(new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Branches.Add(new Branch { BranchId = Branch, BranchCode = "COL", Name = "Colombo", IsActive = true });
        db.Products.Add(new Product { Id = Product, SKU = "SKU-1", Name = "Paracetamol", IsActive = productActive, ReorderLevel = 150 });
        db.Inventories.Add(new Inventory { InventoryId = Guid.NewGuid(), BranchId = Branch, ProductId = Product, QuantityOnHand = 40 });
        db.SaveChanges();

        return new ReplenishmentOrchestrator(
            _inventoryAgent.Object, _forecastAgent.Object, _supplierAgent.Object, _procurementAgent.Object,
            new EmbeddedAgentContractValidator(), new EmbeddedAgentSchemaValidator(),
            db, _traces, NullLogger<ReplenishmentOrchestrator>.Instance);
    }

    private static JsonElement Objective(object? body = null) =>
        JsonSerializer.SerializeToElement(body ?? new { branchId = Branch, productId = Product });

    private static AiRecommendation Recommendation(RecommendationType type, IssueType issue = IssueType.LowStock, decimal quantity = 110) => new()
    {
        RecommendationId = Guid.NewGuid(),
        RecommendationType = type,
        IssueType = issue,
        ProductId = Product,
        DestinationBranchId = Branch,
        SourceBranchId = type == RecommendationType.Transfer ? SourceBranch : null,
        SuggestedQuantity = quantity,
        Status = RecommendationStatus.PendingReview,
        Reasoning = "System check."
    };

    private void InventoryReturns(AiRecommendation? generated, AiRecommendation? existingPending = null)
    {
        _inventoryAgent.Setup(a => a.GenerateRecommendationsAsync(Branch))
            .ReturnsAsync(generated is null ? [] : [generated]);
        _inventoryAgent.Setup(a => a.GetRecommendationsAsync(Branch))
            .ReturnsAsync(existingPending is null ? [] : [existingPending]);
    }

    /// <summary>A forecast whose workflow state satisfies demand-forecast-agent-contract.json.</summary>
    private void ForecastReturns(decimal reorderQuantity, string currentStep = "Completed", bool isSuccess = true) =>
        _forecastAgent.Setup(a => a.ExecuteForecastWorkflowAsync(It.IsAny<DemandForecastWorkflowRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AgentExecutionResultDto
            {
                IsSuccess = isSuccess,
                SummaryMessage = isSuccess ? "ok" : "no history",
                Forecast = isSuccess ? new DemandForecastDto { ProductId = Product, BranchId = Branch, RecommendedReorderQuantity = reorderQuantity } : null,
                WorkflowState = new WorkflowStateDto
                {
                    WorkflowId = ForecastWorkflow,
                    Objective = "Forecast",
                    InitiatedBy = ReplenishmentOrchestrator.AgentName,
                    CurrentStep = currentStep,
                    Plan = [new WorkflowPlanStepDto { StepIndex = 0, Action = "FetchSalesHistory", Status = "Completed" }],
                    ApprovalStatus = "NotRequired",
                    FinalOutcome = null
                }
            });

    private void SupplierReturns(Guid? supplier, Guid? quotation, bool candidateListed = true) =>
        _supplierAgent.Setup(a => a.EvaluateQuotationsAsync(Product))
            .ReturnsAsync(new SupplierEvaluationResponseDto(
                [],
                candidateListed && quotation is not null
                    ? [new SupplierEvaluationCandidateDto(supplier!.Value, quotation.Value, "QT-1", 14.2m, 3, 4.2m, 95, 100, 91, 95.8m)]
                    : [],
                quotation is null ? "NoEligibleSupplier" : "PendingHumanApproval",
                true,
                supplier,
                quotation,
                quotation is null ? null : "Selected on highest overall score."));

    private void ProcurementReturns(string status, Guid? proposal = null) =>
        _procurementAgent.Setup(a => a.StartAsync(It.IsAny<JsonElement>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<JsonElement, string, CancellationToken>((objective, _, _) => _procurementObjective = objective.Clone())
            .ReturnsAsync(new ProcurementWorkflowResult(ProcurementWorkflow, proposal, status, null, Array.Empty<BusinessRuleResult>(),
                status == ProcurementWorkflowStatus.PendingApproval ? [] : ["Budget exceeded."]));

    [Fact]
    public async Task Reorder_RunsAllFourAgents_AndStopsAtPendingApproval()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder, IssueType.OutOfStock));
        ForecastReturns(292.4m);
        SupplierReturns(Supplier, Quotation);
        ProcurementReturns(ProcurementWorkflowStatus.PendingApproval, Proposal);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.PendingApproval, result.Status);
        Assert.Equal("Reorder", result.Decision);
        Assert.Equal(293, result.OrderQuantity);                       // D12: forecast sizes (rounded up)
        Assert.Equal(110, result.InventoryShortageQuantity);            // Inventory's number is recorded, not used
        Assert.Equal(Quotation, result.SelectedQuotationId);            // D11: the agent's pick
        Assert.Equal(Proposal, result.ProposalId);
        Assert.True(result.HumanApprovalRequired);
        Assert.Equal(new ReplenishmentChildWorkflows(result.ChildWorkflows.InventoryRecommendationId, ForecastWorkflow, ProcurementWorkflow), result.ChildWorkflows);
        Assert.Empty(result.Errors);

        var handOff = _procurementObjective!.Value;
        Assert.Equal("OutOfStock", handOff.GetProperty("triggerType").GetString());
        Assert.Equal(293, handOff.GetProperty("suggestedQuantity").GetInt32());
        Assert.Equal("DemandForecastAgent", handOff.GetProperty("sourceAgent").GetString());
        Assert.Equal(Supplier, handOff.GetProperty("candidateSupplierId").GetGuid());
        Assert.Equal(Quotation, handOff.GetProperty("quotationId").GetGuid());

        var audit = _traces.Rows[result.WorkflowId];
        Assert.Equal("AwaitHumanApproval", audit.CurrentStep);
        Assert.Equal("PendingHumanApproval", audit.ApprovalStatus);
        var validations = JsonSerializer.Deserialize<List<ValidationResultDto>>(audit.ValidationResultsJson)!;
        Assert.All(validations, v => Assert.True(v.Passed, v.Rule + ": " + v.Details));
        Assert.Contains(validations, v => v.Rule == "OutputMatchesContract");
    }

    [Fact]
    public async Task Transfer_StopsAtInventoryApproval_WithoutCallingOtherAgents()
    {
        var transfer = Recommendation(RecommendationType.Transfer, quantity: 90);
        InventoryReturns(transfer);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.TransferRecommended, result.Status);
        Assert.Equal("Transfer", result.Decision);
        Assert.True(result.HumanApprovalRequired);
        Assert.Contains(transfer.RecommendationId.ToString(), result.NextAction);
        _forecastAgent.VerifyNoOtherCalls();
        _supplierAgent.VerifyNoOtherCalls();
        _procurementAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NoShortage_ReturnsNoActionRequired()
    {
        InventoryReturns(generated: null);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.NoActionRequired, result.Status);
        Assert.Equal("None", result.Decision);
        Assert.False(result.HumanApprovalRequired);
        _forecastAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ExistingPendingRecommendation_IsUsed_WhenAgentSkipsTheProduct()
    {
        var existing = Recommendation(RecommendationType.Reorder);
        InventoryReturns(generated: null, existingPending: existing);
        ForecastReturns(200);
        SupplierReturns(Supplier, Quotation);
        ProcurementReturns(ProcurementWorkflowStatus.PendingApproval, Proposal);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.PendingApproval, result.Status);
        Assert.Equal(existing.RecommendationId, result.ChildWorkflows.InventoryRecommendationId);
    }

    [Fact]
    public async Task ForecastWithoutPositiveQuantity_IsAQuantityConflict_ForAHuman()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(0);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.QuantityConflict, result.Status);
        Assert.True(result.HumanApprovalRequired);
        Assert.Null(result.OrderQuantity);
        _supplierAgent.VerifyNoOtherCalls();
        _procurementAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ForecastBreakingItsContract_Fails_BeforeSupplierEvaluation()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(100, currentStep: "NotAContractStep");

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.Failed, result.Status);
        Assert.Contains(result.Errors, e => e.StartsWith("Demand Forecast Agent output:"));
        _supplierAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task FailedForecast_Fails()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(0, currentStep: "Failed", isSuccess: false);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.Failed, result.Status);
        _supplierAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NoSupplierSelected_StopsBeforeProcurement()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(100);
        SupplierReturns(supplier: null, quotation: null);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.NoEligibleSupplier, result.Status);
        _procurementAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SupplierPickNotAmongEligibleCandidates_Fails()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(100);
        SupplierReturns(Supplier, Quotation, candidateListed: false);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.Failed, result.Status);
        _procurementAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ProcurementChecksFailed_IsReported()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(100);
        SupplierReturns(Supplier, Quotation);
        ProcurementReturns(ProcurementWorkflowStatus.ChecksFailed);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.ChecksFailed, result.Status);
        Assert.Null(result.ProposalId);
        Assert.Contains("Budget exceeded.", result.Errors);
        Assert.Equal(ProcurementWorkflow, result.ChildWorkflows.ProcurementWorkflowId);
    }

    [Fact]
    public async Task ForecastQuantityAboveProcurementLimit_FailsTheHandOffContract()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(250_000);
        SupplierReturns(Supplier, Quotation);

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.Failed, result.Status);
        Assert.Contains(result.Errors, e => e.StartsWith("Procurement Coordinator hand-off:"));
        _procurementAgent.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("{\"branchId\":\"not-a-guid\"}")]
    [InlineData("{\"branchId\":\"11111111-1111-1111-1111-111111111111\",\"productId\":\"11111111-1111-1111-1111-111111111111\",\"extra\":1}")]
    [InlineData("[]")]
    public async Task InvalidObjective_CallsNoAgent(string json)
    {
        var result = await NewOrchestrator().StartAsync(JsonDocument.Parse(json).RootElement, "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.InvalidInput, result.Status);
        Assert.NotEmpty(result.Errors);
        _inventoryAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InactiveProduct_IsInvalidInput()
    {
        var result = await NewOrchestrator(productActive: false).StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.InvalidInput, result.Status);
        _inventoryAgent.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AgentException_IsRecordedAsFailed_NotThrown()
    {
        _inventoryAgent.Setup(a => a.GenerateRecommendationsAsync(Branch)).ThrowsAsync(new InvalidOperationException("db down"));

        var result = await NewOrchestrator().StartAsync(Objective(), "user-1", default);

        Assert.Equal(ReplenishmentWorkflowStatus.Failed, result.Status);
        Assert.Contains(result.Errors, e => e.Contains("db down"));
        Assert.False(_traces.Rows[result.WorkflowId].IsSuccess);
    }

    [Fact]
    public async Task GetWorkflow_ReturnsTrace_AndLiveProposalStatus()
    {
        InventoryReturns(Recommendation(RecommendationType.Reorder));
        ForecastReturns(100);
        SupplierReturns(Supplier, Quotation);
        ProcurementReturns(ProcurementWorkflowStatus.PendingApproval, Proposal);
        var orchestrator = NewOrchestrator();
        var result = await orchestrator.StartAsync(Objective(), "user-1", default);
        _procurementAgent.Setup(a => a.GetWorkflowAsync(ProcurementWorkflow, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProcurementWorkflowDetailResponse(ProcurementWorkflow, "ProcurementCoordinatorAgent", "", "user-1", "PendingApproval",
                "AwaitHumanApproval", "Approved", Proposal, "Approved", DateTime.UtcNow, null, 0, 0, null, null, null, [], [], [], []));

        var detail = await orchestrator.GetWorkflowAsync(result.WorkflowId, default);

        Assert.NotNull(detail);
        Assert.Equal("Approved", detail!.LiveProposalStatus);
        Assert.Equal(6, detail.Steps.Count);
        Assert.All(detail.Steps, s => Assert.Equal("Completed", s.Status));
        Assert.Equal(4, detail.ToolExecutions.Count);
        Assert.Equal(result, detail.Result with { Errors = result.Errors });
        Assert.Null(await orchestrator.GetWorkflowAsync(Guid.NewGuid(), default));
    }

    // ── Golden cases: agentic-ai/evaluation/golden-cases/replenishment-orchestrator.golden.json ──

    private static JsonElement LoadGoldenCases() =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "GoldenCases", "replenishment-orchestrator.golden.json")))
            .RootElement.GetProperty("cases");

    public static IEnumerable<object[]> GoldenCaseNames() =>
        LoadGoldenCases().EnumerateArray().Select(c => new object[] { c.GetProperty("name").GetString()! });

    [Theory]
    [MemberData(nameof(GoldenCaseNames))]
    public async Task GoldenCase(string name)
    {
        var @case = LoadGoldenCases().EnumerateArray().Single(c => c.GetProperty("name").GetString() == name);
        var expected = @case.GetProperty("expected");

        var inventory = @case.GetProperty("inventory");
        var decision = inventory.GetProperty("decision").GetString();
        InventoryReturns(decision == "None"
            ? null
            : Recommendation(Enum.Parse<RecommendationType>(decision!),
                Enum.Parse<IssueType>(inventory.GetProperty("issue").GetString()!),
                inventory.GetProperty("shortage").GetDecimal()));
        if (@case.TryGetProperty("forecast", out var forecast))
            ForecastReturns(forecast.GetProperty("reorderQuantity").GetDecimal());
        if (@case.TryGetProperty("supplier", out var supplier))
            SupplierReturns(supplier.GetProperty("selected").GetBoolean() ? Supplier : null, supplier.GetProperty("selected").GetBoolean() ? Quotation : null);
        if (@case.TryGetProperty("procurement", out var procurement))
        {
            var status = procurement.GetProperty("status").GetString()!;
            ProcurementReturns(status, status == ProcurementWorkflowStatus.PendingApproval ? Proposal : null);
        }

        var result = await NewOrchestrator().StartAsync(Objective(), "golden", default);

        Assert.Equal(expected.GetProperty("status").GetString(), result.Status);
        Assert.Equal(expected.GetProperty("decision").GetString(), result.Decision);
        Assert.Equal(expected.GetProperty("humanApprovalRequired").GetBoolean(), result.HumanApprovalRequired);
        var orderQuantity = expected.GetProperty("orderQuantity");
        Assert.Equal(orderQuantity.ValueKind == JsonValueKind.Null ? null : orderQuantity.GetInt32(), result.OrderQuantity);

        if (expected.TryGetProperty("sourceAgent", out var sourceAgent))
        {
            Assert.Equal(sourceAgent.GetString(), _procurementObjective!.Value.GetProperty("sourceAgent").GetString());
            Assert.Equal(expected.GetProperty("triggerType").GetString(), _procurementObjective.Value.GetProperty("triggerType").GetString());
            Assert.Equal(result.OrderQuantity, _procurementObjective.Value.GetProperty("suggestedQuantity").GetInt32());
        }

        var called = new List<string>();
        if (_inventoryAgent.Invocations.Count > 0) called.Add("InventoryOptimization");
        if (_forecastAgent.Invocations.Count > 0) called.Add("DemandForecast");
        if (_supplierAgent.Invocations.Count > 0) called.Add("SupplierEvaluation");
        if (_procurementAgent.Invocations.Count > 0) called.Add("ProcurementCoordinator");
        Assert.Equal(expected.GetProperty("agentsCalled").EnumerateArray().Select(a => a.GetString()), called);

        // Every run, whatever its outcome, produces output that matches the orchestrator's published contract.
        var validations = JsonSerializer.Deserialize<List<ValidationResultDto>>(_traces.Rows[result.WorkflowId].ValidationResultsJson)!;
        Assert.True(validations.Single(v => v.Rule == "OutputMatchesContract").Passed);
    }

    [Fact]
    public void Controller_AllowsOnlyRolesThatMayTriggerEveryAgent()
    {
        var controller = typeof(ReplenishmentWorkflowsController);
        Assert.Equal("api/agent-workflows/replenishment", controller.GetCustomAttribute<RouteAttribute>()!.Template);
        foreach (var action in new[] { "Start", "GetById" })
        {
            var roles = controller.GetMethod(action)!.GetCustomAttribute<AuthorizeAttribute>()!.Roles!.Split(',');
            Assert.Equal(["BranchManager", "BusinessOwner", "ProcurementManager"], roles.Order());
        }
    }
}
