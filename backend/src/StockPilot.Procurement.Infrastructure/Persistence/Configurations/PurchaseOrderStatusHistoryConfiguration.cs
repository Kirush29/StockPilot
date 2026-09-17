using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class PurchaseOrderStatusHistoryConfiguration : IEntityTypeConfiguration<PurchaseOrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderStatusHistory> builder)
    {
        builder.ToTable("PurchaseOrderStatusHistory");
        builder.HasKey(h => h.Id);

        builder.Property(h => h.FromStatus).HasConversion<string>().HasMaxLength(32);
        builder.Property(h => h.ToStatus).HasConversion<string>().HasMaxLength(32);
        builder.Property(h => h.Notes).HasMaxLength(1000);

        builder.HasIndex(h => h.PurchaseOrderId);
    }
}
