using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    // Sales & Demand DbSets (Yours)
    DbSet<Sale> Sales { get; }
    DbSet<SaleItem> SaleItems { get; }
    DbSet<DemandForecast> DemandForecasts { get; }
    DbSet<DemandForecastItem> DemandForecastItems { get; }
    DbSet<ProductDemandMetric> ProductDemandMetrics { get; }
    DbSet<StockPilot.Domain.Entities.Agentic.AgentWorkflowAudit> AgentWorkflowAudits { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
