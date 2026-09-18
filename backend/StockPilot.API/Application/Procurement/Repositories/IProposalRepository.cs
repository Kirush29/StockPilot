using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Repositories;

public interface IProposalRepository
{
    Task<ProcurementProposal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<ProcurementProposal> Items, int TotalCount)> QueryAsync(
        ProposalListQuery query, CancellationToken cancellationToken = default);

    Task AddAsync(ProcurementProposal proposal, CancellationToken cancellationToken = default);
}
