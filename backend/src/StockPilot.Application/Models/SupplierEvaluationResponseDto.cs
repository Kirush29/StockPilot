namespace StockPilot.Application.Models;

public record SupplierEvaluationResponseDto(
    IReadOnlyList<SupplierEvaluationResultDto> AllEvaluations,
    IReadOnlyList<SupplierEvaluationCandidateDto> EligibleCandidates,
    string DecisionStatus,
    bool HumanApprovalRequired
);
