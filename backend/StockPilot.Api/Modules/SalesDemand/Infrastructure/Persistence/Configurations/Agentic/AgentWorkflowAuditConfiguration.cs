using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities.Agentic;

namespace StockPilot.Infrastructure.Persistence.Configurations.Agentic;

public class AgentWorkflowAuditConfiguration : IEntityTypeConfiguration<AgentWorkflowAudit>
{
    public void Configure(EntityTypeBuilder<AgentWorkflowAudit> builder)
    {
        builder.ToTable("AgentWorkflowAudits");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.AgentName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Objective)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.InitiatedBy)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.CurrentStep)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.ApprovalStatus)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.PlanJson)
            .IsRequired();

        builder.Property(a => a.ToolExecutionsJson)
            .IsRequired();

        builder.Property(a => a.ValidationResultsJson)
            .IsRequired();

        builder.Property(a => a.ErrorsJson)
            .IsRequired();

        builder.HasIndex(a => a.AgentName);
        builder.HasIndex(a => a.CreatedAtUtc);
    }
}
