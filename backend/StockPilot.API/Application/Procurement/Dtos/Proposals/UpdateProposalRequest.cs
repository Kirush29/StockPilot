namespace StockPilot.Procurement.Application.Dtos.Proposals;

/// <param name="SubmitForApproval">True moves a Draft/RevisionRequested proposal to PendingApproval after saving the edits.</param>
public record UpdateProposalRequest(
    Guid SupplierId,
    Guid? QuotationId,
    string? Justification,
    IReadOnlyList<ProposalLineItemRequest> LineItems,
    bool SubmitForApproval = true);
