using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class BatchConfiguration : IEntityTypeConfiguration<Batch>
{
    public void Configure(EntityTypeBuilder<Batch> builder)
    {
        builder.HasKey(b => b.BatchId);
        builder.Property(b => b.BatchNumber).IsRequired().HasMaxLength(100);
        builder.HasIndex(b => new { b.BatchNumber, b.BranchId }).IsUnique();
        builder.HasIndex(b => b.ExpiryDate);
        builder.Property(b => b.Quantity).HasPrecision(18, 4);
        builder.Property(b => b.UnitCost).HasPrecision(18, 2);
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Batch_Quantity", "\"Quantity\" >= 0");
            t.HasCheckConstraint("CK_Batch_UnitCost", "\"UnitCost\" >= 0");
        });
        builder.Property(b => b.Status).HasConversion<string>();

        builder.HasOne(b => b.Product)
            .WithMany(p => p.Batches)
            .HasForeignKey(b => b.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Branch)
            .WithMany(br => br.Batches)
            .HasForeignKey(b => b.BranchId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
