using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("PurchaseOrders");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber).HasMaxLength(32).IsRequired();
        builder.Property(o => o.TotalCost).HasPrecision(18, 2);
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(32);

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
