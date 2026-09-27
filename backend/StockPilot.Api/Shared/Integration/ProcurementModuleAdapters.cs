using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Abstractions;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Integration;

// Integration glue (plan §2.1 step 5): Procurement's documented cross-module contracts, implemented as
// read-only lookups over the real Inventory (S1) and Supplier (S3) tables in the shared database. They
// replace Procurement's in-memory stand-ins at runtime; Procurement's own tests keep the stand-ins.
// No module logic lives here: each method is a lookup and a field mapping.

/// <summary><see cref="IProductCatalogService"/> over the merged <c>products</c> table (D1).</summary>
public class InventoryProductCatalogAdapter(InventorySupplierDbContext db) : IProductCatalogService
{
    public async Task<ProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken = default) =>
        await db.Products.AsNoTracking()
            .Where(p => p.Id == productId)
            .Select(p => new ProductInfo(p.Id, p.SKU, p.Name, p.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
}

/// <summary><see cref="IBranchDirectoryService"/> over Inventory's <c>Branches</c> table.</summary>
public class InventoryBranchDirectoryAdapter(InventorySupplierDbContext db) : IBranchDirectoryService
{
    public async Task<BranchInfo?> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default) =>
        await db.Branches.AsNoTracking()
            .Where(b => b.BranchId == branchId)
            .Select(b => new BranchInfo(b.BranchId, b.Name, b.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
}

/// <summary><see cref="ISupplierDirectoryService"/> over the Supplier module's <c>suppliers</c> and <c>quotations</c> tables.</summary>
public class SupplierDirectoryAdapter(InventorySupplierDbContext db) : ISupplierDirectoryService
{
    public async Task<SupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken = default) =>
        await db.Suppliers.AsNoTracking()
            .Where(s => s.Id == supplierId)
            .Select(s => new SupplierInfo(s.Id, s.Name, s.IsActive, s.IsBlocked))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<SupplierQuotationInfo?> GetQuotationAsync(Guid quotationId, CancellationToken cancellationToken = default)
    {
        var quotation = await db.Quotations.AsNoTracking().FirstOrDefaultAsync(q => q.Id == quotationId, cancellationToken);

        // The Supplier module stores ValidUntil as a UTC DateTime and has no free-text notes on a quotation.
        return quotation is null
            ? null
            : new SupplierQuotationInfo(
                quotation.Id,
                quotation.SupplierId,
                new DateTimeOffset(DateTime.SpecifyKind(quotation.ValidUntil, DateTimeKind.Utc)),
                quotation.ProductId,
                quotation.UnitPrice);
    }
}
