using Microsoft.EntityFrameworkCore;
using StockPilot.Application.DTOs.Batch;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Exceptions;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Infrastructure.Persistence;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;
using StockPilot.Shared.Data;
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

        // Ensure product exists and is active in Inventory so receiving into an Inventory batch succeeds
        var product = await inventory.Products.FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);
        if (product == null)
        {
            var (name, sku, unit) = ResolveProductMetadata(productId);
            if (await inventory.Products.AnyAsync(p => p.SKU == sku, cancellationToken))
            {
                sku = $"{sku}-{productId.ToString("N")[..4].ToUpperInvariant()}";
            }

            var category = await inventory.Categories.FirstOrDefaultAsync(c => c.IsActive, cancellationToken);

            product = new StockPilot.Domain.Entities.Product
            {
                Id = productId,
                Name = name,
                SKU = sku,
                Unit = unit,
                CostPrice = lines[lineIndex].UnitPrice,
                SellingPrice = lines[lineIndex].UnitPrice > 0 ? lines[lineIndex].UnitPrice * 1.25m : 100m,
                CategoryId = category?.CategoryId,
                ReorderLevel = 20,
                MinimumStockLevel = 5,
                MaximumStockLevel = 500,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            inventory.Products.Add(product);
            await inventory.SaveChangesAsync(cancellationToken);
        }
        else if (!product.IsActive)
        {
            product.IsActive = true;
            await inventory.SaveChangesAsync(cancellationToken);
        }

        // Ensure branch exists and is active in Inventory
        var branch = await inventory.Branches.FirstOrDefaultAsync(b => b.BranchId == branchId, cancellationToken);
        if (branch == null)
        {
            var branchName = branchId == SeedIds.Branch ? "Colombo Central Branch" : $"Branch {branchId.ToString("N")[..6]}";
            inventory.Branches.Add(new StockPilot.Domain.Entities.Branch
            {
                BranchId = branchId,
                BranchCode = branchId == SeedIds.Branch ? "COL-01" : $"BR-{branchId.ToString("N")[..4].ToUpperInvariant()}",
                Name = branchName,
                IsActive = true
            });
            await inventory.SaveChangesAsync(cancellationToken);
        }
        else if (!branch.IsActive)
        {
            branch.IsActive = true;
            await inventory.SaveChangesAsync(cancellationToken);
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

    private static (string Name, string SKU, string Unit) ResolveProductMetadata(Guid productId)
    {
        if (productId == SeedIds.ProductPaper) return ("Copy Paper A4 80gsm (Ream)", "PPR-A4-80G", "Ream");
        if (productId == SeedIds.ProductInk) return ("Printer Ink Cartridge (Black)", "INK-BLK-STD", "Unit");
        if (productId == SeedIds.ProductChair) return ("Office Chair (Ergonomic)", "FUR-CHR-OFC", "Unit");
        if (productId == SeedIds.ProductToner) return ("Laser Printer Toner (Black)", "TNR-LSR-BLK", "Unit");
        if (productId == SeedIds.ProductStapler) return ("Heavy-Duty Stapler", "STP-HD-01", "Unit");
        if (productId == PlatformDemoDataSeeder.ProductParacetamol) return ("Paracetamol 500mg (100 Tabs)", "SKU-PARACETAMOL-500", "Box");
        if (productId == PlatformDemoDataSeeder.ProductAmoxicillin) return ("Amoxicillin 250mg Capsules", "SKU-AMOXICILLIN-250", "Box");
        if (productId == PlatformDemoDataSeeder.ProductVitaminC) return ("Vitamin C 1000mg Effervescent", "SKU-VITAMINC-1000", "Tube");
        if (productId == PlatformDemoDataSeeder.ProductMasks) return ("3-Ply Surgical Masks (Box of 50)", "SKU-MASKS-SURG-50", "Box");

        var shortId = productId.ToString("N")[..8].ToUpperInvariant();
        return ($"Procured Product {shortId}", $"PROD-{shortId}", "Unit");
    }
}
