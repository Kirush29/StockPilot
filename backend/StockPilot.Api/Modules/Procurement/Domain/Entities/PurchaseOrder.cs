using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Domain.Entities;

/// <summary>The finalized order created only once its source proposal has been approved.</summary>
public class PurchaseOrder
{
    public Guid Id { get; set; }

    public Guid ProposalId { get; set; }

    public ProcurementProposal? Proposal { get; set; }

    public Guid SupplierId { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Ordered;

    public decimal TotalCost { get; set; }

    public DateOnly? ExpectedDeliveryDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public List<PurchaseOrderLineItem> LineItems { get; set; } = [];

    public List<PurchaseOrderStatusHistory> StatusHistory { get; set; } = [];
}
