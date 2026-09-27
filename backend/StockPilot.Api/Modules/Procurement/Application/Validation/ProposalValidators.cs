using FluentValidation;
using StockPilot.Procurement.Application.Dtos.Proposals;

namespace StockPilot.Procurement.Application.Validation;

public class ProposalLineItemRequestValidator : AbstractValidator<ProposalLineItemRequest>
{
    public ProposalLineItemRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
    }
}

public class CreateProposalRequestValidator : AbstractValidator<CreateProposalRequest>
{
    public CreateProposalRequestValidator()
    {
        RuleFor(x => x.BranchId).NotEmpty();
        RuleFor(x => x.SupplierId).NotEmpty();
        RuleFor(x => x.LineItems).NotEmpty().WithMessage("A proposal must have at least one line item.");
        RuleForEach(x => x.LineItems).SetValidator(new ProposalLineItemRequestValidator());
    }
}

public class UpdateProposalRequestValidator : AbstractValidator<UpdateProposalRequest>
{
    public UpdateProposalRequestValidator()
    {
        RuleFor(x => x.SupplierId).NotEmpty();
        RuleFor(x => x.LineItems).NotEmpty().WithMessage("A proposal must have at least one line item.");
        RuleForEach(x => x.LineItems).SetValidator(new ProposalLineItemRequestValidator());
    }
}

public class DecisionRequestValidator : AbstractValidator<DecisionRequest>
{
    public DecisionRequestValidator()
    {
        RuleFor(x => x.Decision).IsInEnum();
        RuleFor(x => x.Comment)
            .NotEmpty()
            .When(x => x.Decision != Domain.Enums.ApprovalDecisionType.Approved)
            .WithMessage("A comment is required when rejecting or requesting revision.");
    }
}
