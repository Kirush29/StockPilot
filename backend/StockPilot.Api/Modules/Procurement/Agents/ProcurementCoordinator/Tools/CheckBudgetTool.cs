using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;

public record CheckBudgetInput(Guid BranchId, DateOnly PeriodStart, DateOnly PeriodEnd, decimal ProposedAmount);

public record CheckBudgetOutput(bool Allowed, decimal Remaining, decimal Allocated, decimal Spent, Guid? BudgetId, string? Reason);

/// <summary>Read-only. Wraps <see cref="IBudgetService.CheckAvailabilityAsync"/>, which does all the budget arithmetic.</summary>
public class CheckBudgetTool(IBudgetService budgetService) : ProcurementAgentTool<CheckBudgetInput, CheckBudgetOutput>
{
    public const string ToolName = "CheckBudget";

    public override string Name => ToolName;

    public override string InputSchema => "check-budget.input.schema.json";

    public override string OutputSchema => "check-budget.output.schema.json";

    public override bool IsIdempotent => true;

    protected override async Task<CheckBudgetOutput> ExecuteAsync(CheckBudgetInput input, CancellationToken cancellationToken)
    {
        var availability = await budgetService.CheckAvailabilityAsync(
            input.BranchId, input.PeriodStart, input.PeriodEnd, input.ProposedAmount, cancellationToken);

        return new CheckBudgetOutput(
            availability.Allowed,
            availability.RemainingAmount,
            availability.AllocatedAmount,
            availability.SpentAmount,
            availability.BudgetId,
            availability.Reason);
    }
}
