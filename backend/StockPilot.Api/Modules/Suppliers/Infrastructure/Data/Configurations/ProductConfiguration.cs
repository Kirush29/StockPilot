using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.SKU)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(p => p.SKU).IsUnique();

        builder.Property(p => p.Barcode).HasMaxLength(100);
        builder.HasIndex(p => p.Barcode).IsUnique().HasFilter("\"Barcode\" IS NOT NULL");

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(p => p.Category)
            .HasMaxLength(100);

        builder.Property(p => p.Brand)
            .HasMaxLength(200);

        builder.Property(p => p.Model)
            .HasMaxLength(200);

        builder.Property(p => p.Unit).HasMaxLength(50);
        builder.Property(p => p.CostPrice).HasPrecision(18, 2);
        builder.Property(p => p.SellingPrice).HasPrecision(18, 2);
        builder.Property(p => p.MinimumStockLevel).HasPrecision(18, 4);
        builder.Property(p => p.ReorderLevel).HasPrecision(18, 4);
        builder.Property(p => p.MaximumStockLevel).HasPrecision(18, 4);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Product_CostPrice", "\"CostPrice\" >= 0");
            t.HasCheckConstraint("CK_Product_SellingPrice", "\"SellingPrice\" >= 0");
            t.HasCheckConstraint("CK_Product_StockLevels", "\"MinimumStockLevel\" >= 0 AND \"ReorderLevel\" >= 0 AND \"MaximumStockLevel\" >= 0");
        });

        builder.HasOne(p => p.CategoryNavigation)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(p => p.CreatedAt).IsRequired();
        builder.Property(p => p.UpdatedAt).IsRequired();
        builder.Property(p => p.IsActive).IsRequired();
    }
}
