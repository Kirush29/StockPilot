using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Proposals;

public record ProposalSummaryResponse(
    Guid Id,
    Guid BranchId,
    Guid SupplierId,
    ProposalStatus Status,
    decimal TotalEstimatedCost,
    bool CreatedByAgent,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record ProposalDetailResponse(
    Guid Id,
    Guid BranchId,
    Guid SupplierId,
    Guid? QuotationId,
    Guid CreatedByUserId,
    bool CreatedByAgent,
    ProposalStatus Status,
    decimal TotalEstimatedCost,
    string? Justification,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ProposalLineItemResponse> LineItems,
    IReadOnlyList<ApprovalDecisionResponse> ApprovalDecisions);

public record ApprovalDecisionResponse(
    Guid Id,
    Guid DecidedByUserId,
    ApprovalDecisionType Decision,
    string? Comment,
    DateTimeOffset DecidedAt);
