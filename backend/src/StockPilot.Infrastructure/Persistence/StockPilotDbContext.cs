using System.Reflection;
using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Infrastructure.Persistence;

public class StockPilotDbContext : DbContext, IApplicationDbContext
{
    public StockPilotDbContext(DbContextOptions<StockPilotDbContext> options)
        : base(options)
    {
    }

    // Sales & Demand (Yours)
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<DemandForecast> DemandForecasts => Set<DemandForecast>();
    public DbSet<DemandForecastItem> DemandForecastItems => Set<DemandForecastItem>();
    public DbSet<ProductDemandMetric> ProductDemandMetrics => Set<ProductDemandMetric>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Automatically discovers and applies configurations from this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Custom pre-save logic (such as timestamp tracking) can be added here
        return base.SaveChangesAsync(cancellationToken);
    }
}
