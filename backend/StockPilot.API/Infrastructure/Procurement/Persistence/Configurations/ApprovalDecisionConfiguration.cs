using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class ApprovalDecisionConfiguration : IEntityTypeConfiguration<ApprovalDecision>
{
    public void Configure(EntityTypeBuilder<ApprovalDecision> builder)
    {
        var decisions = string.Join(", ", Enum.GetNames<ApprovalDecisionType>().Select(n => $"'{n}'"));
        builder.ToTable("ApprovalDecisions", t => t.HasCheckConstraint(
            "CK_ApprovalDecisions_Decision", $"\"Decision\" IN ({decisions})"));
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Comment).HasMaxLength(2000);
        builder.Property(d => d.Decision).HasConversion<string>().HasMaxLength(32);
        builder.Property(d => d.DecidedAt).HasColumnType("timestamptz");
        builder.Property(d => d.CreatedAt).HasColumnType("timestamptz");
        builder.Property(d => d.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(d => d.ProposalId);
    }
}
