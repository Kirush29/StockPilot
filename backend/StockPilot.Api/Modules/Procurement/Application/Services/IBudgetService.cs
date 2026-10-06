using StockPilot.Procurement.Application.Dtos.Budgets;

namespace StockPilot.Procurement.Application.Services;

public interface IBudgetService
{
    Task<IReadOnlyList<BudgetResponse>> ListAsync(Guid? branchId, CancellationToken cancellationToken = default);

    Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken = default);

    Task<BudgetUtilizationResponse> GetUtilizationAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether <paramref name="proposedAmount"/> fits the remaining amount of the branch budget
    /// whose period covers <paramref name="periodStart"/>..<paramref name="periodEnd"/>. Read-only.
    /// </summary>
    Task<BudgetAvailabilityResponse> CheckAvailabilityAsync(
        Guid branchId, DateOnly periodStart, DateOnly periodEnd, decimal proposedAmount, CancellationToken cancellationToken = default);
}
