using System.Text.Json;
using System.Text.Json.Serialization;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Procurement.Application.Dtos.Rules;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator;

/// <summary>Serializer settings shared by the agent's schemas, tool payloads and persisted trace.</summary>
public static class AgentJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
}

/// <summary>Terminal outcome of one Procurement Coordinator Agent run.</summary>
public static class ProcurementWorkflowStatus
{
    /// <summary>A proposal was created and is waiting for a human decision. The agent has stopped.</summary>
    public const string PendingApproval = nameof(PendingApproval);

    /// <summary>Budget or business-rule checks failed; no proposal was created.</summary>
    public const string ChecksFailed = nameof(ChecksFailed);

    /// <summary>The objective payload failed schema validation; no tool was called.</summary>
    public const string InvalidInput = nameof(InvalidInput);

    /// <summary>A tool failed (timeout, retries exhausted, invalid output) or the run hit an unexpected error.</summary>
    public const string Failed = nameof(Failed);
}

/// <summary>Objective payload; shape enforced by <c>workflow-input.schema.json</c> before it is deserialized.</summary>
public record ProcurementWorkflowStartRequest(
    string TriggerType,
    Guid ProductId,
    Guid BranchId,
    int SuggestedQuantity,
    Guid CandidateSupplierId,
    Guid QuotationId,
    string SourceAgent);

public record BudgetCheckSummary(decimal Allocated, decimal Spent, decimal Remaining, bool Passed);

/// <summary>Output contract of a run; shape documented by <c>workflow-output.schema.json</c>.</summary>
public record ProcurementWorkflowResult(
    Guid WorkflowId,
    Guid? ProposalId,
    string Status,
    BudgetCheckSummary? BudgetCheck,
    IReadOnlyList<BusinessRuleResult> BusinessRuleResults,
    IReadOnlyList<string> Errors)
{
    /// <summary>Always true: this agent can never approve its own proposal.</summary>
    public bool HumanApprovalRequired => true;
}

/// <summary>One line of the purchasing plan. Every number is copied from a quotation or computed in code, never produced by an LLM.</summary>
public record PurchasingPlanLine(Guid ProductId, string ProductLabel, int Quantity, decimal UnitPrice, decimal LineTotal);

public record PurchasingPlan(
    Guid BranchId,
    Guid SupplierId,
    string SupplierLabel,
    Guid QuotationId,
    IReadOnlyList<PurchasingPlanLine> Lines,
    decimal TotalCost);

/// <summary>
/// Everything about a run that doesn't fit <see cref="WorkflowStateDto"/>'s generic fields, persisted
/// as the audit row's FinalOutcomeJson. <see cref="Input"/> is the validated objective, or a
/// truncated copy of the raw payload when validation failed.
/// </summary>
public record ProcurementWorkflowRecord(
    JsonElement? Input,
    PurchasingPlan? Plan,
    string? Justification,
    string? JustificationSource,
    ProcurementWorkflowResult Result);

/// <summary>Response for GET /api/agent-workflows/{workflowId}: status, the output contract, and the full execution trace.</summary>
public record ProcurementWorkflowDetailResponse(
    Guid WorkflowId,
    string AgentName,
    string Objective,
    string InitiatedBy,
    string Status,
    string CurrentStep,
    string ApprovalStatus,
    Guid? ProposalId,
    string? ProposalStatus,
    DateTime StartedAtUtc,
    DateTime? UpdatedAtUtc,
    long ExecutionDurationMs,
    int RetryCount,
    ProcurementWorkflowResult? Result,
    PurchasingPlan? Plan,
    string? Justification,
    IReadOnlyList<WorkflowPlanStepDto> Steps,
    IReadOnlyList<ToolExecutionDto> ToolExecutions,
    IReadOnlyList<ValidationResultDto> ValidationResults,
    IReadOnlyList<string> Errors);

/// <summary>Body of POST /api/agent-workflows/{workflowId}/approve.</summary>
public record ApproveWorkflowRequest(string? Comment);
