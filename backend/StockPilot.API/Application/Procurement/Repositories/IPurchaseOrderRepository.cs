using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Repositories;

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<PurchaseOrder> Items, int TotalCount)> QueryAsync(
        OrderListQuery query, CancellationToken cancellationToken = default);

    Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default);

    /// <summary>Next sequential order number for the given year, e.g. "PO-2026-000042".</summary>
    Task<string> GenerateOrderNumberAsync(int year, CancellationToken cancellationToken = default);
}
