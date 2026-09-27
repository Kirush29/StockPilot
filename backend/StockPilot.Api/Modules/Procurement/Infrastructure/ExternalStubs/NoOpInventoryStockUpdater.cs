using Microsoft.Extensions.Logging;
using StockPilot.Procurement.Application.Abstractions;

namespace StockPilot.Procurement.Infrastructure.ExternalStubs;

/// <summary>
/// Temporary stand-in for the teammate-built Inventory module. Logs what it would have done
/// instead of updating stock. Replace the registration in <see cref="DependencyInjection"/>
/// with a real client once that module exists.
/// </summary>
public class NoOpInventoryStockUpdater(ILogger<NoOpInventoryStockUpdater> logger) : IInventoryStockUpdater
{
    public Task NotifyStockReceivedAsync(
        Guid branchId, Guid productId, int quantityReceived, Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "[Inventory stub] Would increase stock for product {ProductId} at branch {BranchId} by {Quantity} following purchase order {PurchaseOrderId}",
            productId, branchId, quantityReceived, purchaseOrderId);
        return Task.CompletedTask;
    }
}
