namespace StockPilot.Procurement.Application.Dtos.Proposals;

/// <param name="SubmitForApproval">
/// True (default) moves the proposal straight to PendingApproval. False saves it as Draft,
/// editable via PUT until the caller is ready to submit it for review.
/// </param>
public record CreateProposalRequest(
    Guid BranchId,
    Guid SupplierId,
    Guid? QuotationId,
    string? Justification,
    bool CreatedByAgent,
    IReadOnlyList<ProposalLineItemRequest> LineItems,
    bool SubmitForApproval = true);
