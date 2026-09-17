using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Infrastructure.Persistence.Configurations.Sales;

public class SaleItemConfiguration : IEntityTypeConfiguration<SaleItem>
{
    public void Configure(EntityTypeBuilder<SaleItem> builder)
    {
        builder.ToTable("SaleItems");

        builder.HasKey(si => si.Id);

        builder.Property(si => si.ProductSku)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(si => si.ProductName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(si => si.Category)
            .HasMaxLength(100);

        builder.Property(si => si.Quantity)
            .HasPrecision(18, 2);

        builder.Property(si => si.UnitPrice)
            .HasPrecision(18, 2);

        builder.Property(si => si.DiscountPercent)
            .HasPrecision(5, 2);

        builder.Property(si => si.TotalPrice)
            .HasPrecision(18, 2);
    }
}
