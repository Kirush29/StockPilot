namespace StockPilot.Procurement.Application.Dtos.Budgets;

public record CreateBudgetRequest(Guid BranchId, DateOnly PeriodStart, DateOnly PeriodEnd, decimal AllocatedAmount);

public record BudgetResponse(
    Guid Id,
    Guid BranchId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal AllocatedAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public record BudgetUtilizationResponse(
    Guid BudgetId,
    Guid BranchId,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal AllocatedAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    double UtilizationPercentage);
