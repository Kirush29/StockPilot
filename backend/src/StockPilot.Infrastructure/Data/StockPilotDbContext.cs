using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data;

public class StockPilotDbContext : DbContext
{
    public StockPilotDbContext(DbContextOptions<StockPilotDbContext> options)
        : base(options)
    {
    }

    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<SupplierRating> SupplierRatings => Set<SupplierRating>();
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasSequence<int>("QuotationReferenceSequence")
            .StartsAt(1)
            .IncrementsBy(1);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(StockPilotDbContext).Assembly);
    }
}
