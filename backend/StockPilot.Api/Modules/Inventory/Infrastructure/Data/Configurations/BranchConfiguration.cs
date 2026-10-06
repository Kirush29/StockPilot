using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class BranchConfiguration : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> builder)
    {
        builder.HasKey(b => b.BranchId);
        builder.Property(b => b.BranchCode).IsRequired().HasMaxLength(20);
        builder.HasIndex(b => b.BranchCode).IsUnique();
        builder.Property(b => b.Name).IsRequired().HasMaxLength(200);
        builder.Property(b => b.Address).HasMaxLength(500);
        builder.Property(b => b.City).HasMaxLength(100);
        builder.Property(b => b.PhoneNumber).HasMaxLength(50);
        builder.Property(b => b.Email).HasMaxLength(200);
        builder.Property(b => b.ManagerName).HasMaxLength(200);
    }
}
