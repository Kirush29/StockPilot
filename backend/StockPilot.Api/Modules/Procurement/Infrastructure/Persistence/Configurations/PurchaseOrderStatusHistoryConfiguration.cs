using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class PurchaseOrderStatusHistoryConfiguration : IEntityTypeConfiguration<PurchaseOrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderStatusHistory> builder)
    {
        var statuses = string.Join(", ", Enum.GetNames<PurchaseOrderStatus>().Select(n => $"'{n}'"));
        builder.ToTable("PurchaseOrderStatusHistory", t =>
        {
            t.HasCheckConstraint("CK_PurchaseOrderStatusHistory_FromStatus", $"\"FromStatus\" IS NULL OR \"FromStatus\" IN ({statuses})");
            t.HasCheckConstraint("CK_PurchaseOrderStatusHistory_ToStatus", $"\"ToStatus\" IN ({statuses})");
        });
        builder.HasKey(h => h.Id);

        builder.Property(h => h.FromStatus).HasConversion<string>().HasMaxLength(32);
        builder.Property(h => h.ToStatus).HasConversion<string>().HasMaxLength(32);
        builder.Property(h => h.Notes).HasMaxLength(1000);
        builder.Property(h => h.ChangedAt).HasColumnType("timestamptz");
        builder.Property(h => h.CreatedAt).HasColumnType("timestamptz");
        builder.Property(h => h.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(h => h.PurchaseOrderId);
    }
}
