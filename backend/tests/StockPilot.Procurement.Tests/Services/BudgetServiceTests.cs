using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using StockPilot.Procurement.Application.Dtos.Budgets;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Tests.TestHelpers;
using Xunit;

namespace StockPilot.Procurement.Tests.Services;

public class BudgetServiceTests
{
    private static readonly Guid BranchId = Guid.NewGuid();

    private readonly InMemoryBudgetRepository _budgets = new();
    private readonly FakeBranchDirectoryService _branches = new FakeBranchDirectoryService().WithBranch(BranchId);

    private BudgetService BuildService() => new(_budgets, _branches, new InMemoryUnitOfWork(), NullLogger<BudgetService>.Instance);

    [Fact]
    public async Task CreateAsync_OverlappingPeriod_ThrowsConflict()
    {
        var service = BuildService();
        var start = new DateOnly(2026, 1, 1);
        var end = new DateOnly(2026, 12, 31);
        await service.CreateAsync(new CreateBudgetRequest(BranchId, start, end, 100_000m), CancellationToken.None);

        var act = () => service.CreateAsync(new CreateBudgetRequest(BranchId, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 30), 5_000m), CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task GetUtilizationAsync_ComputesPercentageCorrectly()
    {
        _budgets.Budgets.Add(new Budget
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            PeriodStart = new DateOnly(2026, 1, 1),
            PeriodEnd = new DateOnly(2026, 12, 31),
            AllocatedAmount = 10_000m,
            SpentAmount = 2_500m
        });
        var service = BuildService();
        var budgetId = _budgets.Budgets[0].Id;

        var result = await service.GetUtilizationAsync(budgetId, CancellationToken.None);

        result.UtilizationPercentage.Should().Be(25d);
        result.RemainingAmount.Should().Be(7_500m);
    }
}
