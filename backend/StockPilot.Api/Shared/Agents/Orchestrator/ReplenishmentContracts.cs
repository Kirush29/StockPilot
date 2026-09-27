using System.Text.Json;
using StockPilot.Application.AgenticAI.Contracts;

namespace StockPilot.Shared.Agents.Orchestrator;

/// <summary>Terminal outcome of one Replenishment Orchestrator run (see workflow-output.schema.json).</summary>
public static class ReplenishmentWorkflowStatus
{
    /// <summary>The Procurement Coordinator created a proposal that is waiting for a human decision.</summary>
    public const string PendingApproval = nameof(PendingApproval);

    /// <summary>Inventory Optimization recommends a transfer; it waits for approval in the Inventory module.</summary>
    public const string TransferRecommended = nameof(TransferRecommended);

    /// <summary>Inventory Optimization found no shortage for this product at this branch.</summary>
    public const string NoActionRequired = nameof(NoActionRequired);

    /// <summary>A reorder is recommended but the forecast gives no positive order quantity (D12). A human decides.</summary>
    public const string QuantityConflict = nameof(QuantityConflict);

    /// <summary>Supplier Evaluation selected no quotation.</summary>
    public const string NoEligibleSupplier = nameof(NoEligibleSupplier);

    /// <summary>The Procurement Coordinator's budget or business-rule checks failed; no proposal was created.</summary>
    public const string ChecksFailed = nameof(ChecksFailed);

    /// <summary>The objective failed validation; no agent was called.</summary>
    public const string InvalidInput = nameof(InvalidInput);

    /// <summary>An agent failed or a hand-off broke its contract.</summary>
    public const string Failed = nameof(Failed);
}

/// <summary>Objective payload; shape enforced by <c>replenishment-orchestrator/workflow-input.schema.json</c>.</summary>
public record ReplenishmentObjective(Guid BranchId, Guid ProductId, int? ForecastDays, int? LeadTimeDays);

/// <summary>Ids of each agent's own record for this run.</summary>
public record ReplenishmentChildWorkflows(Guid? InventoryRecommendationId, Guid? DemandForecastWorkflowId, Guid? ProcurementWorkflowId);

/// <summary>Output contract of a run; shape documented by <c>replenishment-orchestrator/workflow-output.schema.json</c>.</summary>
public record ReplenishmentWorkflowResult(
    Guid WorkflowId,
    string Status,
    Guid BranchId,
    Guid ProductId,
    string? Decision,
    int? OrderQuantity,
    decimal? ForecastReorderQuantity,
    decimal? InventoryShortageQuantity,
    Guid? SelectedSupplierId,
    Guid? SelectedQuotationId,
    Guid? ProposalId,
    bool HumanApprovalRequired,
    string? NextAction,
    ReplenishmentChildWorkflows ChildWorkflows,
    IReadOnlyList<string> Errors);

/// <summary>Persisted as the audit row's FinalOutcomeJson.</summary>
public record ReplenishmentWorkflowRecord(JsonElement? Input, ReplenishmentWorkflowResult Result);

/// <summary>Response for GET /api/agent-workflows/replenishment/{workflowId}.</summary>
public record ReplenishmentWorkflowDetail(
    Guid WorkflowId,
    string Objective,
    string InitiatedBy,
    string CurrentStep,
    string ApprovalStatus,
    DateTime StartedAtUtc,
    DateTime? UpdatedAtUtc,
    long ExecutionDurationMs,
    ReplenishmentWorkflowResult? Result,
    string? LiveProposalStatus,
    IReadOnlyList<WorkflowPlanStepDto> Steps,
    IReadOnlyList<ToolExecutionDto> ToolExecutions,
    IReadOnlyList<ValidationResultDto> ValidationResults,
    IReadOnlyList<string> Errors);
