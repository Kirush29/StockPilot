using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Proposals;

namespace StockPilot.Procurement.Application.Services;

public interface IProcurementProposalService
{
    Task<ProposalDetailResponse> CreateAsync(CreateProposalRequest request, CancellationToken cancellationToken = default);

    Task<PagedResult<ProposalSummaryResponse>> ListAsync(ProposalListQuery query, CancellationToken cancellationToken = default);

    Task<ProposalDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<ProposalDetailResponse> UpdateAsync(Guid id, UpdateProposalRequest request, CancellationToken cancellationToken = default);

    Task<ProposalDetailResponse> DecideAsync(Guid id, DecisionRequest request, CancellationToken cancellationToken = default);
}
