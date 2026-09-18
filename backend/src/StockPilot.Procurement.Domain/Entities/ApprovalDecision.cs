using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Domain.Entities;

/// <summary>Immutable audit record of an approve/reject/revise decision on a proposal.</summary>
public class ApprovalDecision
{
    public Guid Id { get; set; }

    public Guid ProposalId { get; set; }

    public ProcurementProposal? Proposal { get; set; }

    public Guid DecidedByUserId { get; set; }

    public ApprovalDecisionType Decision { get; set; }

    public string? Comment { get; set; }

    public DateTimeOffset DecidedAt { get; set; }

    /// <summary>Audit column. Always equal to <see cref="UpdatedAt"/> since decisions are immutable.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Audit column. Always equal to <see cref="CreatedAt"/> since decisions are immutable.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
