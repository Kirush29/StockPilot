namespace StockPilot.Procurement.Domain.Entities;

/// <summary>A single product/quantity/price line within a <see cref="PurchaseOrder"/>.</summary>
public class PurchaseOrderLineItem
{
    public Guid Id { get; set; }

    public Guid PurchaseOrderId { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }

    public Guid ProductId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal => Quantity * UnitPrice;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
