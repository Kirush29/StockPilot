using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Infrastructure.Persistence.Configurations.Sales;

public class DemandForecastItemConfiguration : IEntityTypeConfiguration<DemandForecastItem>
{
    public void Configure(EntityTypeBuilder<DemandForecastItem> builder)
    {
        builder.ToTable("DemandForecastItems");

        builder.HasKey(dfi => dfi.Id);

        builder.Property(dfi => dfi.PredictedQuantity)
            .HasPrecision(18, 2);

        builder.Property(dfi => dfi.LowerBoundQuantity)
            .HasPrecision(18, 2);

        builder.Property(dfi => dfi.UpperBoundQuantity)
            .HasPrecision(18, 2);
    }
}
