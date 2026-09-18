using StockPilot.Procurement.Application.Dtos.Budgets;

namespace StockPilot.Procurement.Application.Services;

public interface IBudgetService
{
    Task<IReadOnlyList<BudgetResponse>> ListAsync(Guid? branchId, CancellationToken cancellationToken = default);

    Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken = default);

    Task<BudgetUtilizationResponse> GetUtilizationAsync(Guid id, CancellationToken cancellationToken = default);
}
