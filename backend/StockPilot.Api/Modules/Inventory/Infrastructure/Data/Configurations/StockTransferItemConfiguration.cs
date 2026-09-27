using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class StockTransferItemConfiguration : IEntityTypeConfiguration<StockTransferItem>
{
    public void Configure(EntityTypeBuilder<StockTransferItem> builder)
    {
        builder.HasKey(i => i.StockTransferItemId);
        builder.Property(i => i.RequestedQuantity).HasPrecision(18, 4);
        builder.Property(i => i.ApprovedQuantity).HasPrecision(18, 4);
        builder.Property(i => i.ShippedQuantity).HasPrecision(18, 4);
        builder.Property(i => i.ReceivedQuantity).HasPrecision(18, 4);
        builder.ToTable(t => t.HasCheckConstraint("CK_TransferItem_RequestedQty", "\"RequestedQuantity\" > 0"));

        builder.HasOne(i => i.StockTransfer)
            .WithMany(st => st.Items)
            .HasForeignKey(i => i.StockTransferId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Product)
            .WithMany(p => p.TransferItems)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Batch)
            .WithMany(b => b.TransferItems)
            .HasForeignKey(i => i.BatchId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
