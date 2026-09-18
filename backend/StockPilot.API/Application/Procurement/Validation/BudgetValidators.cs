using FluentValidation;
using StockPilot.Procurement.Application.Dtos.Budgets;

namespace StockPilot.Procurement.Application.Validation;

public class CreateBudgetRequestValidator : AbstractValidator<CreateBudgetRequest>
{
    public CreateBudgetRequestValidator()
    {
        RuleFor(x => x.BranchId).NotEmpty();
        RuleFor(x => x.AllocatedAmount).GreaterThan(0);
        RuleFor(x => x.PeriodEnd).GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}
