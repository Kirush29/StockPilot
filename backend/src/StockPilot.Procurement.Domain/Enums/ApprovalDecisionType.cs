namespace StockPilot.Procurement.Domain.Enums;

/// <summary>Outcome recorded by a human reviewer on a <see cref="Entities.ProcurementProposal"/>.</summary>
public enum ApprovalDecisionType
{
    Approved = 0,
    Rejected = 1,
    RevisionRequested = 2
}
