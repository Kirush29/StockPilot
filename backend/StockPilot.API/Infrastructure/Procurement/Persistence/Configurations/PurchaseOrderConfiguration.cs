using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        var statuses = string.Join(", ", Enum.GetNames<PurchaseOrderStatus>().Select(n => $"'{n}'"));
        builder.ToTable("PurchaseOrders", t => t.HasCheckConstraint(
            "CK_PurchaseOrders_Status", $"\"Status\" IN ({statuses})"));
        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber).HasMaxLength(32).IsRequired();
        builder.Property(o => o.TotalCost).HasPrecision(12, 2);
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(o => o.CreatedAt).HasColumnType("timestamptz");
        builder.Property(o => o.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(o => o.OrderNumber).IsUnique();
        builder.HasIndex(o => o.ProposalId);
        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.SupplierId);

        builder.HasOne(o => o.Proposal)
            .WithMany()
            .HasForeignKey(o => o.ProposalId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.LineItems)
            .WithOne(li => li.PurchaseOrder)
            .HasForeignKey(li => li.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.StatusHistory)
            .WithOne(h => h.PurchaseOrder)
            .HasForeignKey(h => h.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
