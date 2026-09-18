namespace StockPilot.Procurement.Domain.Enums;

/// <summary>Fulfillment status of a <see cref="Entities.PurchaseOrder"/>.</summary>
public enum PurchaseOrderStatus
{
    Ordered = 0,
    PartiallyReceived = 1,
    Received = 2,
    Cancelled = 3
}
