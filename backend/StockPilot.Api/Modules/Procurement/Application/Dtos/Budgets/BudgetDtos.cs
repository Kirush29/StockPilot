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

/// <summary>
/// Whether <paramref name="ProposedAmount"/> fits the remaining budget of the single budget
/// covering the whole requested period. <paramref name="BudgetId"/> is null when no budget covers it.
/// </summary>
public record BudgetAvailabilityResponse(
    Guid? BudgetId,
    bool Allowed,
    decimal AllocatedAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal ProposedAmount,
    string? Reason);
