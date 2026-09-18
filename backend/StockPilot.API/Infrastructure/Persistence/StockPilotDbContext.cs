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
    public DbSet<StockPilot.Domain.Entities.Agentic.AgentWorkflowAudit> AgentWorkflowAudits => Set<StockPilot.Domain.Entities.Agentic.AgentWorkflowAudit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Automatically discovers and applies configurations from this assembly, scoped to this
        // module's own namespace so the Procurement module's configurations (same assembly since
        // the merge into StockPilot.API) aren't picked up into this unrelated DbContext's model.
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly(),
            type => type.Namespace is not null && type.Namespace.StartsWith("StockPilot.Infrastructure", StringComparison.Ordinal));
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Custom pre-save logic (such as timestamp tracking) can be added here
        return base.SaveChangesAsync(cancellationToken);
    }
}
