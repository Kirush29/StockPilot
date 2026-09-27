using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Infrastructure.Persistence.Configurations.Sales;

public class DemandForecastConfiguration : IEntityTypeConfiguration<DemandForecast>
{
    public void Configure(EntityTypeBuilder<DemandForecast> builder)
    {
        builder.ToTable("DemandForecasts");

        builder.HasKey(df => df.Id);

        builder.Property(df => df.ProductSku)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(df => df.ProductName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(df => df.BranchName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(df => df.PredictedTotalDemand)
            .HasPrecision(18, 2);

        builder.Property(df => df.AverageDailyDemand)
            .HasPrecision(18, 2);

        builder.Property(df => df.RecommendedSafetyStock)
            .HasPrecision(18, 2);

        builder.Property(df => df.RecommendedReorderQuantity)
            .HasPrecision(18, 2);

        builder.HasMany(df => df.Items)
            .WithOne(i => i.DemandForecast)
            .HasForeignKey(i => i.DemandForecastId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
