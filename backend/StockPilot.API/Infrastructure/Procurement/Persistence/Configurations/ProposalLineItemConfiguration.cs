using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence.Configurations;

public class ProposalLineItemConfiguration : IEntityTypeConfiguration<ProposalLineItem>
{
    public void Configure(EntityTypeBuilder<ProposalLineItem> builder)
    {
        builder.ToTable("ProposalLineItems");
        builder.HasKey(li => li.Id);

        builder.Property(li => li.UnitPrice).HasPrecision(12, 2);
        builder.Property(li => li.LineTotal).HasPrecision(12, 2);
        builder.Property(li => li.CreatedAt).HasColumnType("timestamptz");
        builder.Property(li => li.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(li => li.ProposalId);
        builder.HasIndex(li => li.ProductId);
    }
}
