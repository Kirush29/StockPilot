using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfPurchaseOrderRepository(ProcurementDbContext context) : IPurchaseOrderRepository
{
    public Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.PurchaseOrders
            .Include(o => o.Proposal)
            .Include(o => o.LineItems)
            .Include(o => o.StatusHistory)
            .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public async Task<(IReadOnlyList<PurchaseOrder> Items, int TotalCount)> QueryAsync(
        OrderListQuery query, CancellationToken cancellationToken = default)
    {
        var filtered = context.PurchaseOrders.AsNoTracking().AsQueryable();

        if (query.Status is { } status)
        {
            filtered = filtered.Where(o => o.Status == status);
        }

        var totalCount = await filtered.CountAsync(cancellationToken);

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);

        var items = await filtered
            .Include(o => o.LineItems)
            .Include(o => o.StatusHistory)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default) =>
        await context.PurchaseOrders.AddAsync(order, cancellationToken);

    public async Task<string> GenerateOrderNumberAsync(int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"PO-{year}-";
        var countThisYear = await context.PurchaseOrders
            .CountAsync(o => o.OrderNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}{(countThisYear + 1):D6}";
    }
}
