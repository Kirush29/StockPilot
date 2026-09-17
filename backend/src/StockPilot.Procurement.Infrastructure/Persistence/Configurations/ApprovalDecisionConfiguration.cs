using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class ApprovalDecisionConfiguration : IEntityTypeConfiguration<ApprovalDecision>
{
    public void Configure(EntityTypeBuilder<ApprovalDecision> builder)
    {
        builder.ToTable("ApprovalDecisions");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Comment).HasMaxLength(2000);
        builder.Property(d => d.Decision).HasConversion<string>().HasMaxLength(32);

        builder.HasIndex(d => d.ProposalId);
    }
}
