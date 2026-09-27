namespace StockPilot.Procurement.Application.Exceptions;

public class BudgetExceededException(decimal requested, decimal remaining)
    : Exception($"Requested amount {requested:C} exceeds remaining budget of {remaining:C}.")
{
    public decimal Requested { get; } = requested;

    public decimal Remaining { get; } = remaining;
}
