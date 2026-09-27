using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfPurchaseOrderRepository(IProcurementDbContext context) : IPurchaseOrderRepository
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

    // Arbitrary fixed key for pg_advisory_xact_lock, reserved for purchase order numbering.
    private const long OrderNumberLockKey = 0x50_4F_4E_55_4D; // "PONUM"

    public async Task<string> GenerateOrderNumberAsync(int year, CancellationToken cancellationToken = default)
    {
        var prefix = $"PO-{year}-";

        if (context.Database.IsInMemory())
        {
            // Local dev without Postgres: no locking, but still MAX + 1 so gaps can't cause a repeat.
            var numbers = await context.PurchaseOrders
                .Where(o => o.OrderNumber.StartsWith(prefix))
                .Select(o => o.OrderNumber)
                .ToListAsync(cancellationToken);
            return Format(prefix, numbers.Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0).DefaultIfEmpty(0).Max() + 1);
        }

        // Held until the caller's transaction commits or rolls back, so two conversions can't both
        // read the same MAX. A plain COUNT + 1 repeated an existing number whenever the sequence had a gap.
        await context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0})", [OrderNumberLockKey], cancellationToken);

        var pattern = $"^{prefix}[0-9]+$";
        var highest = await context.Database
            .SqlQuery<int>($"""
                SELECT COALESCE(MAX(CAST(substring("OrderNumber" from {prefix.Length + 1}) AS integer)), 0) AS "Value"
                FROM procurement."PurchaseOrders"
                WHERE "OrderNumber" ~ {pattern}
                """)
            .SingleAsync(cancellationToken);

        return Format(prefix, highest + 1);
    }

    private static string Format(string prefix, int number) => $"{prefix}{number:D6}";
}
