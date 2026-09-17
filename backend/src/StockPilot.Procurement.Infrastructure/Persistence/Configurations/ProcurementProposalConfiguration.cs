using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class ProcurementProposalConfiguration : IEntityTypeConfiguration<ProcurementProposal>
{
    public void Configure(EntityTypeBuilder<ProcurementProposal> builder)
    {
        builder.ToTable("ProcurementProposals");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.TotalEstimatedCost).HasPrecision(18, 2);
        builder.Property(p => p.Justification).HasMaxLength(2000);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.SupplierId);
        builder.HasIndex(p => p.BranchId);

        builder.HasMany(p => p.LineItems)
            .WithOne(li => li.Proposal)
            .HasForeignKey(li => li.ProposalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.ApprovalDecisions)
            .WithOne(d => d.Proposal)
            .HasForeignKey(d => d.ProposalId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
