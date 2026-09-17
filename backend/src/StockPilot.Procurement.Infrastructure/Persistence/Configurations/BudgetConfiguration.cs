using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("Budgets");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.AllocatedAmount).HasPrecision(18, 2);
        builder.Property(b => b.SpentAmount).HasPrecision(18, 2);

        builder.Ignore(b => b.RemainingAmount);

        builder.HasIndex(b => b.BranchId);
        builder.HasIndex(b => new { b.BranchId, b.PeriodStart, b.PeriodEnd });
    }
}
