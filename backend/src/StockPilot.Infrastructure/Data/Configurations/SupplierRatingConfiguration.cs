using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class SupplierRatingConfiguration : IEntityTypeConfiguration<SupplierRating>
{
    public void Configure(EntityTypeBuilder<SupplierRating> builder)
    {
        builder.ToTable("supplier_ratings");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.SupplierId)
            .IsRequired();

        builder.Property(r => r.Rating)
            .HasPrecision(3, 2)
            .IsRequired();

        builder.Property(r => r.Comment)
            .HasMaxLength(1000);

        builder.Property(r => r.RatedAt)
            .IsRequired();

        builder.Property(r => r.IsActive)
            .IsRequired();

        builder.HasOne(r => r.Supplier)
            .WithMany(s => s.SupplierRatings)
            .HasForeignKey(r => r.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
