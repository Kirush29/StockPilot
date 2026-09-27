namespace StockPilot.Application.Models;

public record SupplierEvaluationResponseDto(
    IReadOnlyList<SupplierEvaluationResultDto> AllEvaluations,
    IReadOnlyList<SupplierEvaluationCandidateDto> EligibleCandidates,
    string DecisionStatus,
    bool HumanApprovalRequired,
    // Integration decision D11: the agent's pick, as returned by agentic-ai (supplier-evaluation-output.schema.json).
    // Previously dropped when the agent's output was deserialized. Null when there is no eligible supplier.
    Guid? SelectedSupplierId = null,
    Guid? SelectedQuotationId = null,
    string? ReasonSummary = null
);
