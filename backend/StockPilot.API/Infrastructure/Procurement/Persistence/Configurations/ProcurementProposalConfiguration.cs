using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class ProcurementProposalConfiguration : IEntityTypeConfiguration<ProcurementProposal>
{
    public void Configure(EntityTypeBuilder<ProcurementProposal> builder)
    {
        var statuses = string.Join(", ", Enum.GetNames<ProposalStatus>().Select(n => $"'{n}'"));
        builder.ToTable("ProcurementProposals", t => t.HasCheckConstraint(
            "CK_ProcurementProposals_Status", $"\"Status\" IN ({statuses})"));
        builder.HasKey(p => p.Id);

        builder.Property(p => p.TotalEstimatedCost).HasPrecision(12, 2);
        builder.Property(p => p.Justification).HasMaxLength(2000);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.CreatedAt).HasColumnType("timestamptz");
        builder.Property(p => p.UpdatedAt).HasColumnType("timestamptz");

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
