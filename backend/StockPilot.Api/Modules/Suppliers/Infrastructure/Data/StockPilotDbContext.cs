using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data;

public class StockPilotDbContext : DbContext
{
    public StockPilotDbContext(DbContextOptions<StockPilotDbContext> options)
        : base(options)
    {
    }

    // Integration (D2): lets the shared AppDbContext in StockPilot.API derive from this context,
    // so Inventory/Supplier services that inject StockPilotDbContext are served by the one platform context.
    protected StockPilotDbContext(DbContextOptions options)
        : base(options)
    {
    }

    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<SupplierRating> SupplierRatings => Set<SupplierRating>();
    public DbSet<Product> Products => Set<Product>();

    // Added for Inventory
    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    public DbSet<AiRecommendation> AiRecommendations => Set<AiRecommendation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasSequence<int>("QuotationReferenceSequence")
            .StartsAt(1)
            .IncrementsBy(1);
        // Integration: this context's configurations used to be alone in their own assembly (src/StockPilot.Infrastructure).
        // Now that all modules share the StockPilot.Api assembly, the scan is limited to that same set.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(StockPilotDbContext).Assembly,
            type => type.Namespace is not null && type.Namespace.StartsWith("StockPilot.Infrastructure.Data", StringComparison.Ordinal));
    }
}
