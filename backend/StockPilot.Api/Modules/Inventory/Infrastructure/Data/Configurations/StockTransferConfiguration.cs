using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class StockTransferConfiguration : IEntityTypeConfiguration<StockTransfer>
{
    public void Configure(EntityTypeBuilder<StockTransfer> builder)
    {
        builder.HasKey(st => st.StockTransferId);
        builder.Property(st => st.TransferNumber).IsRequired().HasMaxLength(50);
        builder.HasIndex(st => st.TransferNumber).IsUnique();
        builder.HasIndex(st => st.Status);
        builder.Property(st => st.Status).HasConversion<string>();
        builder.Property(st => st.Notes).HasMaxLength(1000);
        builder.Property(st => st.RejectionReason).HasMaxLength(500);

        builder.HasOne(st => st.SourceBranch)
            .WithMany(b => b.OutboundTransfers)
            .HasForeignKey(st => st.SourceBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(st => st.DestinationBranch)
            .WithMany(b => b.InboundTransfers)
            .HasForeignKey(st => st.DestinationBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(st => st.RequestedByUser)
            .WithMany(u => u.RequestedTransfers)
            .HasForeignKey(st => st.RequestedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(st => st.ApprovedByUser)
            .WithMany(u => u.ApprovedTransfers)
            .HasForeignKey(st => st.ApprovedBy)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
