using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Domain.Entities;

namespace StockPilot.Infrastructure.Data.Configurations;

public class AiRecommendationConfiguration : IEntityTypeConfiguration<AiRecommendation>
{
    public void Configure(EntityTypeBuilder<AiRecommendation> builder)
    {
        builder.HasKey(a => a.RecommendationId);
        builder.Property(a => a.RecommendationType).HasConversion<string>().IsRequired().HasMaxLength(50);
        builder.Property(a => a.IssueType).HasConversion<string>().IsRequired().HasMaxLength(50);
        builder.Property(a => a.Priority).HasConversion<string>().IsRequired().HasMaxLength(50);
        builder.Property(a => a.Status).HasConversion<string>().IsRequired().HasMaxLength(50);
        builder.Property(a => a.Reasoning).HasMaxLength(2000);
        builder.Property(a => a.RejectionReason).HasMaxLength(1000);
        builder.Property(a => a.SuggestedQuantity).HasPrecision(18, 4);
        builder.Property(a => a.ConfidenceScore).HasPrecision(4, 3);

        builder.HasIndex(a => new { a.DestinationBranchId, a.Status });
        builder.HasIndex(a => new { a.ProductId, a.Status });
        builder.HasIndex(a => a.IssueType);
        builder.HasIndex(a => a.CreatedAt);

        builder.HasOne(a => a.DestinationBranch)
            .WithMany()
            .HasForeignKey(a => a.DestinationBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.SourceBranch)
            .WithMany()
            .HasForeignKey(a => a.SourceBranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Product)
            .WithMany()
            .HasForeignKey(a => a.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Batch)
            .WithMany()
            .HasForeignKey(a => a.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.CreatedTransfer)
            .WithMany()
            .HasForeignKey(a => a.CreatedTransferId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.ReviewedByUser)
            .WithMany()
            .HasForeignKey(a => a.ReviewedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
