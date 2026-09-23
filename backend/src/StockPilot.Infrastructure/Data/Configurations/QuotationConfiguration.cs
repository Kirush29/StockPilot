using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class QuotationConfiguration : IEntityTypeConfiguration<Quotation>
{
    public void Configure(EntityTypeBuilder<Quotation> builder)
    {
        builder.ToTable("quotations");

        builder.HasKey(q => q.Id);

        builder.Property(q => q.QuotationReference)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.HasIndex(q => q.QuotationReference)
            .IsUnique();

        builder.Property(q => q.SupplierId)
            .IsRequired();

        builder.Property(q => q.ProductId)
            .IsRequired();

        builder.Property(q => q.UnitPrice)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(q => q.Quantity)
            .IsRequired();

        builder.Property(q => q.DeliveryDays)
            .IsRequired();

        builder.Property(q => q.Status)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(q => q.CreatedAt)
            .IsRequired();

        builder.Property(q => q.ValidUntil)
            .IsRequired();

        builder.Property(q => q.SubmittedAt)
            .IsRequired();

        builder.HasOne(q => q.Supplier)
            .WithMany(s => s.Quotations)
            .HasForeignKey(q => q.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
