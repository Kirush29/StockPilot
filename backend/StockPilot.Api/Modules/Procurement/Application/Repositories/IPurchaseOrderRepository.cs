using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Repositories;

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<PurchaseOrder> Items, int TotalCount)> QueryAsync(
        OrderListQuery query, CancellationToken cancellationToken = default);

    Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default);

    /// <summary>
    /// Next order number for the given year, e.g. "PO-2026-000042": one past the highest number
    /// already used that year, so gaps never lead to a repeat. Call it inside the transaction that
    /// inserts the order; the implementation serializes concurrent callers until that transaction ends.
    /// </summary>
    Task<string> GenerateOrderNumberAsync(int year, CancellationToken cancellationToken = default);
}
