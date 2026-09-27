using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Domain.Entities;

/// <summary>
/// An AI- or manager-generated draft purchase plan awaiting review, linked to a supplier
/// quotation. Approval is required before it can be converted into a <see cref="PurchaseOrder"/>.
/// </summary>
public class ProcurementProposal
{
    public Guid Id { get; set; }

    /// <summary>Branch this proposal draws budget from. Not sourced from another module's table.</summary>
    public Guid BranchId { get; set; }

    public Guid SupplierId { get; set; }

    public Guid? QuotationId { get; set; }

    /// <summary>Id of the user who raised the proposal (a human, or the service account used by the agent).</summary>
    public Guid CreatedByUserId { get; set; }

    /// <summary>True when the Procurement Coordinator Agent produced this proposal rather than a human.</summary>
    public bool CreatedByAgent { get; set; }

    public ProposalStatus Status { get; set; } = ProposalStatus.Draft;

    public decimal TotalEstimatedCost { get; set; }

    public string? Justification { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public List<ProposalLineItem> LineItems { get; set; } = [];

    public List<ApprovalDecision> ApprovalDecisions { get; set; } = [];
}
