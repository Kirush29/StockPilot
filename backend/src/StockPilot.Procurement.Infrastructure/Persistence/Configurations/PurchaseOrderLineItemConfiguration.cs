using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class PurchaseOrderLineItemConfiguration : IEntityTypeConfiguration<PurchaseOrderLineItem>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderLineItem> builder)
    {
        builder.ToTable("PurchaseOrderLineItems");
        builder.HasKey(li => li.Id);

        builder.Property(li => li.UnitPrice).HasPrecision(12, 2);
        builder.Property(li => li.CreatedAt).HasColumnType("timestamptz");
        builder.Property(li => li.UpdatedAt).HasColumnType("timestamptz");
        builder.Ignore(li => li.LineTotal);

        builder.HasIndex(li => li.PurchaseOrderId);
        builder.HasIndex(li => li.ProductId);
    }
}
