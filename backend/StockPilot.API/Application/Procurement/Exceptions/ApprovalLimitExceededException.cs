namespace StockPilot.Procurement.Application.Exceptions;

public class ApprovalLimitExceededException(decimal requested, decimal limit)
    : Exception($"Proposal amount {requested:C} exceeds your approval limit of {limit:C}.")
{
    public decimal Requested { get; } = requested;

    public decimal Limit { get; } = limit;
}
