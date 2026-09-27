namespace StockPilot.Procurement.Domain.Entities;

/// <summary>A single product/quantity/price line within a <see cref="ProcurementProposal"/>.</summary>
public class ProposalLineItem
{
    public Guid Id { get; set; }

    public Guid ProposalId { get; set; }

    public ProcurementProposal? Proposal { get; set; }

    public Guid ProductId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
