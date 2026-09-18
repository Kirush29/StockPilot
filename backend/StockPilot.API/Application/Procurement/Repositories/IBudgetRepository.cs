using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Repositories;

public interface IBudgetRepository
{
    Task<Budget?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Budget>> GetByBranchAsync(Guid? branchId, CancellationToken cancellationToken = default);

    /// <summary>The budget for a branch whose period covers the given date, if any.</summary>
    Task<Budget?> FindActiveBudgetAsync(Guid branchId, DateOnly date, CancellationToken cancellationToken = default);

    Task AddAsync(Budget budget, CancellationToken cancellationToken = default);
}
