namespace StockPilot.Procurement.Domain.Enums;

/// <summary>Lifecycle status of a <see cref="Entities.ProcurementProposal"/>.</summary>
public enum ProposalStatus
{
    Draft = 0,
    PendingApproval = 1,
    Approved = 2,
    Rejected = 3,
    RevisionRequested = 4,
    Converted = 5
}
