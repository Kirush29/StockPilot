using FluentValidation;
using StockPilot.Procurement.Application.Dtos.Orders;

namespace StockPilot.Procurement.Application.Validation;

public class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}
