using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Orders;

namespace StockPilot.Procurement.Application.Services;

public interface IPurchaseOrderService
{
    /// <summary>Converts an Approved proposal into a PurchaseOrder. Fails if the proposal is not Approved or was already converted.</summary>
    Task<PurchaseOrderDetailResponse> ConvertProposalAsync(Guid proposalId, CancellationToken cancellationToken = default);

    Task<PagedResult<PurchaseOrderSummaryResponse>> ListAsync(OrderListQuery query, CancellationToken cancellationToken = default);

    Task<PurchaseOrderDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PurchaseOrderDetailResponse> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken cancellationToken = default);
}
