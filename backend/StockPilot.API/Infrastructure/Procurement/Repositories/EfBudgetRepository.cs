using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfBudgetRepository(ProcurementDbContext context) : IBudgetRepository
{
    public Task<Budget?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Budgets.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Budget>> GetByBranchAsync(Guid? branchId, CancellationToken cancellationToken = default)
    {
        var query = context.Budgets.AsNoTracking().AsQueryable();
        if (branchId is { } id)
        {
            query = query.Where(b => b.BranchId == id);
        }

        return await query.OrderByDescending(b => b.PeriodStart).ToListAsync(cancellationToken);
    }

    public Task<Budget?> FindActiveBudgetAsync(Guid branchId, DateOnly date, CancellationToken cancellationToken = default) =>
        context.Budgets.FirstOrDefaultAsync(
            b => b.BranchId == branchId && b.PeriodStart <= date && date <= b.PeriodEnd,
            cancellationToken);

    public async Task AddAsync(Budget budget, CancellationToken cancellationToken = default) =>
        await context.Budgets.AddAsync(budget, cancellationToken);
}
