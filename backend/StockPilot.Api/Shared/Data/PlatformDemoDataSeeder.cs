using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Data;

/// <summary>
/// Development-only demo data that makes the four modules' existing seeds agree with each other.
///
/// Each module seeded or stubbed its own view of the catalogue: Sales' SalesDataSeeder records sales for four
/// pharmacy products, and Procurement's stand-ins and budget refer to office-supply products, suppliers and
/// quotations by fixed ids (<see cref="SeedIds"/>). None of those existed in the Inventory/Supplier tables.
/// This seeder inserts exactly those rows, with the same ids, so the real Inventory/Supplier modules and
/// Procurement's adapters see the same data. It also adds a small stock and quotation scenario so the
/// replenishment orchestrator can be run end to end:
/// <list type="bullet">
/// <item>Paracetamol at Colombo is below its reorder level and no branch has surplus, so Inventory Optimization recommends a reorder.</item>
/// <item>Vitamin C at Colombo is below its reorder level and Kandy has surplus, so Inventory Optimization recommends a transfer.</item>
/// </list>
/// Rows are inserted only when their id is missing, so reruns and manual edits are left alone.
/// </summary>
public static class PlatformDemoDataSeeder
{
    public static readonly Guid BranchColombo = new("11111111-1111-1111-1111-111111111111"); // = SeedIds.Branch and the dev-account branch
    public static readonly Guid BranchKandy = new("22222222-2222-2222-2222-222222222222");

    public static readonly Guid CategoryPharmacy = new("a0000000-0000-0000-0000-000000000001");
    public static readonly Guid CategoryOffice = new("a0000000-0000-0000-0000-000000000002");

    // Same ids as SalesDataSeeder, so sales history belongs to real products.
    public static readonly Guid ProductParacetamol = new("18464716-8fa7-49da-b521-08b1dc057c28");
    public static readonly Guid ProductAmoxicillin = new("28464716-8fa7-49da-b521-08b1dc057c29");
    public static readonly Guid ProductVitaminC = new("38464716-8fa7-49da-b521-08b1dc057c30");
    public static readonly Guid ProductMasks = new("48464716-8fa7-49da-b521-08b1dc057c31");

    public static readonly Guid SupplierMediSource = new("b0000000-0000-0000-0000-000000000001");
    public static readonly Guid QuotationParacetamolMediSource = new("c0000000-0000-0000-0000-000000000001");
    public static readonly Guid QuotationParacetamolAcme = new("c0000000-0000-0000-0000-000000000002");

    public static async Task SeedAsync(InventorySupplierDbContext db, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        await AddMissingAsync(db, db.Branches, b => b.BranchId,
        [
            new Branch { BranchId = BranchColombo, BranchCode = "COL-01", Name = "Colombo Central Branch", IsActive = true },
            new Branch { BranchId = BranchKandy, BranchCode = "KAN-01", Name = "Kandy City Branch", IsActive = true }
        ], cancellationToken);

        await AddMissingAsync(db, db.Categories, c => c.CategoryId,
        [
            new Category { CategoryId = CategoryPharmacy, Name = "Pharmacy", Description = "Medicines and medical supplies", IsActive = true },
            new Category { CategoryId = CategoryOffice, Name = "Office Supplies", Description = "Stationery, printing and furniture", IsActive = true }
        ], cancellationToken);

        await AddMissingAsync(db, db.Products, p => p.Id,
        [
            Product(ProductParacetamol, "SKU-PARACETAMOL-500", "Paracetamol 500mg (100 Tabs)", CategoryPharmacy, "Pharmaceuticals", "Box", 14.00m, 24.50m, reorder: 150, now),
            Product(ProductAmoxicillin, "SKU-AMOXICILLIN-250", "Amoxicillin 250mg Capsules", CategoryPharmacy, "Antibiotics", "Box", 28.00m, 45.00m, reorder: 100, now),
            Product(ProductVitaminC, "SKU-VITAMINC-1000", "Vitamin C 1000mg Effervescent", CategoryPharmacy, "Supplements", "Tube", 18.50m, 32.00m, reorder: 120, now),
            Product(ProductMasks, "SKU-MASKS-SURG-50", "3-Ply Surgical Masks (Box of 50)", CategoryPharmacy, "Medical Supplies", "Box", 8.20m, 15.00m, reorder: 200, now),
            Product(SeedIds.ProductPaper, "PPR-A4-80G", "Copy Paper A4 80gsm (Ream)", CategoryOffice, "Office Supplies", "Ream", 450m, 600m, reorder: 20, now),
            Product(SeedIds.ProductInk, "INK-BLK-STD", "Printer Ink Cartridge (Black)", CategoryOffice, "Office Supplies", "Unit", 2_000m, 2_800m, reorder: 5, now),
            Product(SeedIds.ProductChair, "FUR-CHR-OFC", "Office Chair (Ergonomic)", CategoryOffice, "Furniture", "Unit", 25_000m, 32_000m, reorder: 2, now),
            Product(SeedIds.ProductToner, "TNR-LSR-BLK", "Laser Printer Toner (Black)", CategoryOffice, "Office Supplies", "Unit", 7_000m, 9_000m, reorder: 3, now),
            Product(SeedIds.ProductStapler, "STP-HD-01", "Heavy-Duty Stapler", CategoryOffice, "Office Supplies", "Unit", 1_100m, 1_600m, reorder: 2, now)
        ], cancellationToken);

        await AddMissingAsync(db, db.Suppliers, s => s.Id,
        [
            Supplier(SeedIds.Supplier, "SUP-ACME", "Acme Office Supplies Pvt Ltd", rating: 4.2m, blocked: false, now),
            Supplier(SeedIds.SupplierBlocked, "SUP-BLOCKED", "Blocked Traders Ltd", rating: 2.0m, blocked: true, now),
            Supplier(SupplierMediSource, "SUP-MEDI", "MediSource Distributors", rating: 4.6m, blocked: false, now)
        ], cancellationToken);

        await AddMissingAsync(db, db.Quotations, q => q.Id,
        [
            // Procurement's demo quotations (same ids and prices as its stand-ins).
            Quotation(SeedIds.Quotation, "QT-DEMO-001", SeedIds.Supplier, SeedIds.ProductPaper, 500m, 100, 3, now.AddYears(1), now),
            Quotation(SeedIds.QuotationToner, "QT-DEMO-002", SeedIds.Supplier, SeedIds.ProductToner, 7_500m, 10, 5, now.AddMonths(6), now),
            Quotation(SeedIds.QuotationStaplerWithInjectedNote, "QT-DEMO-003", SeedIds.Supplier, SeedIds.ProductStapler, 1_200m, 10, 5, now.AddMonths(6), now),
            // Orchestrator scenario: two competing quotations for the product Inventory will recommend reordering.
            Quotation(QuotationParacetamolMediSource, "QT-DEMO-004", SupplierMediSource, ProductParacetamol, 13.50m, 500, 5, now.AddMonths(3), now),
            Quotation(QuotationParacetamolAcme, "QT-DEMO-005", SeedIds.Supplier, ProductParacetamol, 14.20m, 500, 3, now.AddMonths(3), now)
        ], cancellationToken);

        await AddMissingAsync(db, db.Inventories, i => i.InventoryId,
        [
            Stock("d0000000-0000-0000-0000-000000000001", ProductParacetamol, BranchColombo, 40, now),   // below 150, no surplus anywhere -> Reorder
            Stock("d0000000-0000-0000-0000-000000000002", ProductParacetamol, BranchKandy, 90, now),
            Stock("d0000000-0000-0000-0000-000000000003", ProductVitaminC, BranchColombo, 30, now),      // below 120, Kandy has surplus -> Transfer
            Stock("d0000000-0000-0000-0000-000000000004", ProductVitaminC, BranchKandy, 400, now),
            Stock("d0000000-0000-0000-0000-000000000005", ProductAmoxicillin, BranchColombo, 260, now),  // healthy
            Stock("d0000000-0000-0000-0000-000000000006", ProductMasks, BranchColombo, 500, now)         // healthy
        ], cancellationToken);
    }

    private static async Task AddMissingAsync<T>(InventorySupplierDbContext db, DbSet<T> set, Func<T, Guid> id, IReadOnlyList<T> rows, CancellationToken cancellationToken)
        where T : class
    {
        var ids = rows.Select(id).ToList();
        var existing = (await set.AsNoTracking().ToListAsync(cancellationToken)).Select(id).Where(ids.Contains).ToHashSet();
        var missing = rows.Where(r => !existing.Contains(id(r))).ToList();
        if (missing.Count == 0)
        {
            return;
        }

        set.AddRange(missing);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static Product Product(Guid id, string sku, string name, Guid categoryId, string supplierCategory, string unit,
        decimal cost, decimal selling, decimal reorder, DateTime now) => new()
    {
        Id = id, SKU = sku, Name = name, CategoryId = categoryId, Category = supplierCategory, Unit = unit,
        CostPrice = cost, SellingPrice = selling,
        MinimumStockLevel = reorder / 2, ReorderLevel = reorder, MaximumStockLevel = reorder * 4,
        IsActive = true, CreatedAt = now, UpdatedAt = now
    };

    private static Supplier Supplier(Guid id, string code, string name, decimal rating, bool blocked, DateTime now) => new()
    {
        Id = id, SupplierCode = code, Name = name, ContactEmail = $"{code.ToLowerInvariant()}@example.com",
        ContactPhone = "+94 11 000 0000", Address = "Colombo", Rating = rating, IsActive = true, IsBlocked = blocked,
        CreatedAt = now, UpdatedAt = now
    };

    private static Quotation Quotation(Guid id, string reference, Guid supplierId, Guid productId, decimal unitPrice,
        int quantity, int deliveryDays, DateTime validUntil, DateTime now) => new()
    {
        Id = id, QuotationReference = reference, SupplierId = supplierId, ProductId = productId, UnitPrice = unitPrice,
        Quantity = quantity, DeliveryDays = deliveryDays, Status = QuotationStatus.Pending,
        CreatedAt = now, SubmittedAt = now, ValidUntil = validUntil
    };

    private static Inventory Stock(string id, Guid productId, Guid branchId, decimal onHand, DateTime now) => new()
    {
        InventoryId = new Guid(id), ProductId = productId, BranchId = branchId, QuantityOnHand = onHand, ReservedQuantity = 0, LastUpdatedAt = now
    };
}
