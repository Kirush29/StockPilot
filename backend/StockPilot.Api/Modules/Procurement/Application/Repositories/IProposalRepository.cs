using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Repositories;

public interface IProposalRepository
{
    Task<ProcurementProposal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<ProcurementProposal> Items, int TotalCount)> QueryAsync(
        ProposalListQuery query, CancellationToken cancellationToken = default);

    Task AddAsync(ProcurementProposal proposal, CancellationToken cancellationToken = default);

    /// <summary>
    /// Id of a proposal for the same branch and product that still represents an open need: one
    /// that is Draft, PendingApproval, RevisionRequested or Approved, or Converted into a purchase
    /// order that has not been fully received or cancelled. Null when there is none.
    /// </summary>
    Task<Guid?> FindOpenProposalForProductAsync(Guid branchId, Guid productId, CancellationToken cancellationToken = default);
}
