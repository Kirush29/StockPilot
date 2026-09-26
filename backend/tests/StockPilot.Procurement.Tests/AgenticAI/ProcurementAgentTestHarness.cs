using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StockPilot.Application.AgenticAI.ProcurementCoordinator;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Narrative;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Tests.TestHelpers;

namespace StockPilot.Procurement.Tests.AgenticAI;

/// <summary>
/// Builds a Procurement Coordinator Agent over the real procurement services, tools, gateway and
/// schemas, with in-memory repositories and fake external modules.
/// </summary>
public class ProcurementAgentTestHarness
{
    public static readonly Guid BranchId = Guid.NewGuid();
    public static readonly Guid SupplierId = Guid.NewGuid();
    public static readonly Guid BlockedSupplierId = Guid.NewGuid();
    public static readonly Guid ProductId = Guid.NewGuid();
    public static readonly Guid QuotationId = Guid.NewGuid();
    public static readonly Guid UserId = Guid.NewGuid();
    public const decimal QuotedUnitPrice = 250m;

    public InMemoryProposalRepository Proposals { get; } = new();
    public InMemoryBudgetRepository Budgets { get; } = new();
    public FakeProductCatalogService Products { get; } = new FakeProductCatalogService().WithProduct(ProductId);
    public FakeSupplierDirectoryService Suppliers { get; } = new FakeSupplierDirectoryService()
        .WithSupplier(SupplierId)
        .WithSupplier(BlockedSupplierId, isBlocked: true);
    public FakeBranchDirectoryService Branches { get; } = new FakeBranchDirectoryService().WithBranch(BranchId);
    public InMemoryAgentWorkflowTraceStore Traces { get; } = new();
    public EmbeddedAgentSchemaValidator Schemas { get; } = new();

    public ProcurementAgentOptions Options { get; } = new()
    {
        ToolTimeoutSeconds = 0.3,
        MaxRetries = 2,
        RetryBackoffMilliseconds = 0,
        CancellationGraceMilliseconds = 500,
        LlmTimeoutSeconds = 2
    };

    public ProcurementAgentTestHarness(decimal budgetAllocated = 100_000m, decimal budgetSpent = 0m)
    {
        Suppliers.WithQuotation(QuotationId, SupplierId, DateTimeOffset.UtcNow.AddDays(30), ProductId, QuotedUnitPrice, "Delivery within 5 days.");
        Budgets.Budgets.Add(new Budget
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
            AllocatedAmount = budgetAllocated,
            SpentAmount = budgetSpent
        });
    }

    public ProcurementProposalService ProposalService(params string[] roles) => new(
        Proposals,
        Budgets,
        Products,
        Suppliers,
        Branches,
        new FakeCurrentUserService(UserId, roles.Length > 0 ? roles : [ProcurementRoles.BranchManager]),
        new InMemoryUnitOfWork(),
        Microsoft.Extensions.Options.Options.Create(new ApprovalLimitOptions { ProcurementManager = 50_000m, BusinessOwner = null }),
        NullLogger<ProcurementProposalService>.Instance);

    public List<IProcurementAgentTool> RealTools() =>
    [
        new CheckBudgetTool(new BudgetService(Budgets, Branches, new InMemoryUnitOfWork(), NullLogger<BudgetService>.Instance)),
        new ValidateBusinessRulesTool(new ProcurementBusinessRuleService(Proposals, Products, Suppliers, Branches)),
        new CreateProposalTool(ProposalService())
    ];

    public AgentToolGateway Gateway(IEnumerable<IProcurementAgentTool>? tools = null) =>
        new(tools ?? RealTools(), Schemas, Microsoft.Extensions.Options.Options.Create(Options), NullLogger<AgentToolGateway>.Instance);

    public ProposalJustificationWriter JustificationWriter(IServiceProvider? services = null) =>
        new(services ?? new ServiceCollection().BuildServiceProvider(),
            Microsoft.Extensions.Options.Options.Create(Options),
            NullLogger<ProposalJustificationWriter>.Instance);

    public ProcurementCoordinatorAgent Agent(
        IEnumerable<IProcurementAgentTool>? tools = null,
        IProposalJustificationWriter? writer = null,
        IAgentWorkflowTraceStore? traces = null) =>
        new(Gateway(tools),
            Schemas,
            Products,
            Suppliers,
            ProposalService(),
            writer ?? JustificationWriter(),
            traces ?? Traces,
            Microsoft.Extensions.Options.Options.Create(Options),
            NullLogger<ProcurementCoordinatorAgent>.Instance);

    public static JsonElement Objective(
        int quantity = 40,
        Guid? supplierId = null,
        Guid? quotationId = null,
        Guid? productId = null,
        string triggerType = "LowStock",
        object? extra = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["triggerType"] = triggerType,
            ["productId"] = productId ?? ProductId,
            ["branchId"] = BranchId,
            ["suggestedQuantity"] = quantity,
            ["candidateSupplierId"] = supplierId ?? SupplierId,
            ["quotationId"] = quotationId ?? QuotationId,
            ["sourceAgent"] = "InventoryOptimizationAgent"
        };
        if (extra is not null)
        {
            foreach (var property in JsonSerializer.SerializeToElement(extra).EnumerateObject())
            {
                payload[property.Name] = property.Value;
            }
        }

        return JsonSerializer.SerializeToElement(payload);
    }
}

public class InMemoryAgentWorkflowTraceStore : IAgentWorkflowTraceStore
{
    public Dictionary<Guid, AgentWorkflowAudit> Rows { get; } = new();

    public int SaveCount { get; private set; }

    public Task SaveAsync(AgentWorkflowAudit audit, CancellationToken cancellationToken)
    {
        SaveCount++;
        Rows[audit.Id] = audit;
        return Task.CompletedTask;
    }

    public Task<AgentWorkflowAudit?> FindAsync(Guid workflowId, string agentName, CancellationToken cancellationToken) =>
        Task.FromResult(Rows.TryGetValue(workflowId, out var row) && row.AgentName == agentName ? row : null);
}

public class FailingTraceStore : IAgentWorkflowTraceStore
{
    public Task SaveAsync(AgentWorkflowAudit audit, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("database unavailable");

    public Task<AgentWorkflowAudit?> FindAsync(Guid workflowId, string agentName, CancellationToken cancellationToken) =>
        Task.FromResult<AgentWorkflowAudit?>(null);
}

/// <summary>A stand-in tool with a real tool's name and schemas, whose behaviour each test scripts.</summary>
public class ScriptedTool(string name, string inputSchema, string outputSchema, bool idempotent, Func<int, CancellationToken, Task<object>> behaviour)
    : IProcurementAgentTool
{
    public int Invocations { get; private set; }

    public string Name => name;

    public string InputSchema => inputSchema;

    public string OutputSchema => outputSchema;

    public bool IsIdempotent => idempotent;

    public Task<object> InvokeAsync(JsonElement input, CancellationToken cancellationToken)
    {
        Invocations++;
        return behaviour(Invocations, cancellationToken);
    }

    public static ScriptedTool CheckBudget(Func<int, CancellationToken, Task<object>> behaviour) =>
        new(CheckBudgetTool.ToolName, "check-budget.input.schema.json", "check-budget.output.schema.json", true, behaviour);

    public static ScriptedTool CreateProposal(Func<int, CancellationToken, Task<object>> behaviour) =>
        new(CreateProposalTool.ToolName, "create-proposal.input.schema.json", "create-proposal.output.schema.json", false, behaviour);

    public static object Budget(bool allowed = true) =>
        new CheckBudgetOutput(allowed, 90_000m, 100_000m, 10_000m, Guid.NewGuid(), allowed ? null : "Over budget.");
}
