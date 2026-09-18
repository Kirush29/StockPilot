using Microsoft.Extensions.Logging;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Dtos.Budgets;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Application.Services;

public class BudgetService(
    IBudgetRepository budgets,
    IBranchDirectoryService branches,
    IUnitOfWork unitOfWork,
    ILogger<BudgetService> logger) : IBudgetService
{
    public async Task<IReadOnlyList<BudgetResponse>> ListAsync(Guid? branchId, CancellationToken cancellationToken = default)
    {
        var items = await budgets.GetByBranchAsync(branchId, cancellationToken);
        return items.Select(ToResponse).ToList();
    }

    public async Task<BudgetResponse> CreateAsync(CreateBudgetRequest request, CancellationToken cancellationToken = default)
    {
        var branch = await branches.GetBranchAsync(request.BranchId, cancellationToken)
            ?? throw new ProcurementNotFoundException("Branch", request.BranchId);
        if (!branch.IsActive)
        {
            throw new ProcurementValidationException("branchId", "Branch is not active.");
        }

        var existing = await budgets.GetByBranchAsync(request.BranchId, cancellationToken);
        var overlaps = existing.Any(b => b.PeriodStart <= request.PeriodEnd && request.PeriodStart <= b.PeriodEnd);
        if (overlaps)
        {
            throw new ProcurementConflictException("An existing budget for this branch already covers part of this period.");
        }

        var now = DateTimeOffset.UtcNow;
        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            BranchId = request.BranchId,
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            AllocatedAmount = request.AllocatedAmount,
            SpentAmount = 0m,
            CreatedAt = now,
            UpdatedAt = now
        };

        await budgets.AddAsync(budget, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Budget {BudgetId} created for branch {BranchId}: {AllocatedAmount:C} for {PeriodStart:d} - {PeriodEnd:d}",
            budget.Id, budget.BranchId, budget.AllocatedAmount, budget.PeriodStart, budget.PeriodEnd);

        return ToResponse(budget);
    }

    public async Task<BudgetUtilizationResponse> GetUtilizationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var budget = await budgets.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(Budget), id);

        var utilizationPct = budget.AllocatedAmount == 0m
            ? 0d
            : (double)(budget.SpentAmount / budget.AllocatedAmount) * 100d;

        return new BudgetUtilizationResponse(
            budget.Id,
            budget.BranchId,
            budget.PeriodStart,
            budget.PeriodEnd,
            budget.AllocatedAmount,
            budget.SpentAmount,
            budget.RemainingAmount,
            utilizationPct);
    }

    private static BudgetResponse ToResponse(Budget budget) => new(
        budget.Id,
        budget.BranchId,
        budget.PeriodStart,
        budget.PeriodEnd,
        budget.AllocatedAmount,
        budget.SpentAmount,
        budget.RemainingAmount,
        budget.CreatedAt,
        budget.UpdatedAt);
}
