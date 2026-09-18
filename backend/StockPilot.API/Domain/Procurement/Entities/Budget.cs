namespace StockPilot.Procurement.Domain.Entities;

/// <summary>
/// A branch- and period-scoped spending limit. <see cref="SpentAmount"/> tracks committed
/// spend (raised as soon as a <see cref="PurchaseOrder"/> is placed, not only once received),
/// so it always reflects the true remaining budget.
/// </summary>
public class Budget
{
    public Guid Id { get; set; }

    public Guid BranchId { get; set; }

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    public decimal AllocatedAmount { get; set; }

    public decimal SpentAmount { get; set; }

    public decimal RemainingAmount => AllocatedAmount - SpentAmount;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public bool CoversPeriod(DateOnly date) => date >= PeriodStart && date <= PeriodEnd;
}
