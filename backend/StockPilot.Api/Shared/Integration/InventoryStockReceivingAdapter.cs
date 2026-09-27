using Microsoft.EntityFrameworkCore;
using StockPilot.Application.DTOs.Batch;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Exceptions;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Infrastructure.Persistence;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Integration;

/// <summary>
/// Integration decision D14: when Procurement marks a purchase order Received, each line becomes an Inventory
/// batch through Student 1's own <see cref="IBatchService.CreateAsync"/>, so stock levels, the stock movement
/// and branch-access rules all follow Inventory's existing batch logic.
///
/// Batch number = "{OrderNumber}-L{line}", quantity = quantity received, unit cost = the PO line's unit price,
/// received now, no expiry (editable later in Inventory). Idempotent: Procurement calls this before its own
/// status transaction, so if that transaction fails and receiving is retried, an existing batch for the line
/// is left as it is instead of being created twice.
/// </summary>
public class InventoryStockReceivingAdapter(
    IBatchService batches,
    IProcurementDbContext procurement,
    InventorySupplierDbContext inventory,
    StockPilot.Application.Interfaces.ICurrentUserService currentUser) : IInventoryStockUpdater // Inventory's view of the user, which BatchService checks
{
    public async Task NotifyStockReceivedAsync(
        Guid branchId, Guid productId, int quantityReceived, Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        var order = await procurement.PurchaseOrders.AsNoTracking()
            .Include(o => o.LineItems)
            .FirstOrDefaultAsync(o => o.Id == purchaseOrderId, cancellationToken)
            ?? throw new ProcurementNotFoundException("PurchaseOrder", purchaseOrderId);

        var lines = order.LineItems.OrderBy(l => l.CreatedAt).ThenBy(l => l.Id).ToList();
        var lineIndex = lines.FindIndex(l => l.ProductId == productId && l.Quantity == quantityReceived);
        if (lineIndex < 0)
        {
            lineIndex = lines.FindIndex(l => l.ProductId == productId);
        }

        if (lineIndex < 0)
        {
            throw new ProcurementValidationException("productId", $"Product {productId} is not on purchase order {order.OrderNumber}.");
        }

        var batchNumber = $"{order.OrderNumber}-L{lineIndex + 1}";
        if (await inventory.Batches.AnyAsync(b => b.BatchNumber == batchNumber && b.BranchId == branchId, cancellationToken))
        {
            return; // already received into Inventory
        }

        var dto = new CreateBatchDto
        {
            ProductId = productId,
            BranchId = branchId,
            BatchNumber = batchNumber,
            Quantity = quantityReceived,
            UnitCost = lines[lineIndex].UnitPrice,
            ReceivedDate = DateTime.UtcNow
        };

        try
        {
            await batches.CreateAsync(dto, currentUser.UserId ?? Guid.Empty);
        }
        catch (ForbiddenException ex)
        {
            throw new ProcurementForbiddenException(ex.Message);
        }
        catch (ArgumentException ex)
        {
            throw new ProcurementValidationException("inventory", $"Inventory rejected the received stock: {ex.Message}");
        }
        catch (InvalidOperationException ex)
        {
            throw new ProcurementConflictException($"Inventory rejected the received stock: {ex.Message}");
        }
    }
}
