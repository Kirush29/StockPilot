using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class InventoryConfiguration : IEntityTypeConfiguration<Inventory>
{
    public void Configure(EntityTypeBuilder<Inventory> builder)
    {
        builder.HasKey(i => i.InventoryId);
        builder.HasIndex(i => new { i.ProductId, i.BranchId }).IsUnique();
        builder.Property(i => i.QuantityOnHand).HasPrecision(18, 4);
        builder.Property(i => i.ReservedQuantity).HasPrecision(18, 4);
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Inventory_QuantityOnHand", "\"QuantityOnHand\" >= 0");
            t.HasCheckConstraint("CK_Inventory_ReservedQuantity", "\"ReservedQuantity\" >= 0");
        });
        builder.Ignore(i => i.AvailableQuantity);

        builder.HasOne(i => i.Product)
            .WithMany(p => p.Inventories)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Branch)
            .WithMany(b => b.Inventories)
            .HasForeignKey(i => i.BranchId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
