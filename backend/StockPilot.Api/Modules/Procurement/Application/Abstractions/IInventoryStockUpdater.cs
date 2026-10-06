namespace StockPilot.Procurement.Application.Abstractions;

/// <summary>
/// Notification hook into the (teammate-built) Inventory module, invoked once a purchase
/// order's received quantity changes so stock-on-hand can be increased. This module owns no
/// inventory logic itself; a no-op stub is registered by default and logs what it was asked
/// to do so the integration point stays visible until the real module exists.
/// </summary>
public interface IInventoryStockUpdater
{
    Task NotifyStockReceivedAsync(
        Guid branchId,
        Guid productId,
        int quantityReceived,
        Guid purchaseOrderId,
        CancellationToken cancellationToken = default);
}
