using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Infrastructure.Persistence.Configurations.Sales;

public class ProductDemandMetricConfiguration : IEntityTypeConfiguration<ProductDemandMetric>
{
    public void Configure(EntityTypeBuilder<ProductDemandMetric> builder)
    {
        builder.ToTable("ProductDemandMetrics");

        builder.HasKey(pdm => pdm.Id);

        builder.HasIndex(pdm => new { pdm.ProductId, pdm.BranchId })
            .IsUnique();

        builder.Property(pdm => pdm.ProductSku)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(pdm => pdm.ProductName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(pdm => pdm.AverageDailySales30Days)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.AverageDailySales90Days)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.SalesVelocity)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.StandardDeviationSales)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.ServiceLevelZ)
            .HasPrecision(5, 2);

        builder.Property(pdm => pdm.SafetyStock)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.ReorderPoint)
            .HasPrecision(18, 2);

        builder.Property(pdm => pdm.EconomicOrderQuantity)
            .HasPrecision(18, 2);
    }
}
