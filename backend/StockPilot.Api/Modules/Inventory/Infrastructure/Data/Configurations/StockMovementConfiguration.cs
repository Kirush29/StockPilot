using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.HasKey(sm => sm.StockMovementId);
        builder.HasIndex(sm => sm.CreatedAt);
        builder.HasIndex(sm => new { sm.ProductId, sm.BranchId });
        builder.Property(sm => sm.Quantity).HasPrecision(18, 4);
        builder.Property(sm => sm.PreviousQuantity).HasPrecision(18, 4);
        builder.Property(sm => sm.NewQuantity).HasPrecision(18, 4);
        builder.ToTable(t => t.HasCheckConstraint("CK_StockMovement_Quantity", "\"Quantity\" > 0"));
        builder.Property(sm => sm.MovementType).HasConversion<string>();
        builder.Property(sm => sm.ReferenceType).HasMaxLength(100);
        builder.Property(sm => sm.ReferenceId).HasMaxLength(100);
        builder.Property(sm => sm.Reason).HasMaxLength(500);

        builder.HasOne(sm => sm.Product)
            .WithMany(p => p.StockMovements)
            .HasForeignKey(sm => sm.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(sm => sm.Batch)
            .WithMany(b => b.StockMovements)
            .HasForeignKey(sm => sm.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(sm => sm.Branch)
            .WithMany(b => b.StockMovements)
            .HasForeignKey(sm => sm.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(sm => sm.PerformedByUser)
            .WithMany(u => u.StockMovements)
            .HasForeignKey(sm => sm.PerformedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
