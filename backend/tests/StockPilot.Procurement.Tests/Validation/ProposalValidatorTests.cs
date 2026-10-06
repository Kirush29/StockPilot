using FluentAssertions;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Validation;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Tests.Validation;

public class ProposalValidatorTests
{
    private static CreateProposalRequest Request(params ProposalLineItemRequest[] lines) =>
        new(Guid.NewGuid(), Guid.NewGuid(), null, null, false, lines);

    [Theory]
    [InlineData(-5)]
    [InlineData(0)]
    public void NonPositiveQuantity_IsInvalid(int quantity)
    {
        var result = new CreateProposalRequestValidator().Validate(Request(new ProposalLineItemRequest(Guid.NewGuid(), quantity, 10m)));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "LineItems[0].Quantity");
    }

    [Fact]
    public void NegativeUnitPrice_IsInvalid()
    {
        var result = new CreateProposalRequestValidator().Validate(Request(new ProposalLineItemRequest(Guid.NewGuid(), 1, -0.01m)));

        result.Errors.Should().ContainSingle(e => e.PropertyName == "LineItems[0].UnitPrice");
    }

    [Fact]
    public void NoLineItems_IsInvalid()
    {
        var result = new CreateProposalRequestValidator().Validate(Request());

        result.Errors.Should().ContainSingle(e => e.PropertyName == "LineItems" && e.ErrorMessage.Contains("at least one"));
    }

    [Fact]
    public void EmptyIds_AreInvalid()
    {
        var result = new CreateProposalRequestValidator().Validate(
            new CreateProposalRequest(Guid.Empty, Guid.Empty, null, null, false, [new ProposalLineItemRequest(Guid.Empty, 1, 1m)]));

        result.Errors.Select(e => e.PropertyName).Should().BeEquivalentTo("BranchId", "SupplierId", "LineItems[0].ProductId");
    }

    [Fact]
    public void ValidRequest_Passes()
    {
        new CreateProposalRequestValidator().Validate(Request(new ProposalLineItemRequest(Guid.NewGuid(), 3, 0m)))
            .IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(ApprovalDecisionType.Rejected, null, false)]
    [InlineData(ApprovalDecisionType.RevisionRequested, "", false)]
    [InlineData(ApprovalDecisionType.Rejected, "Over budget", true)]
    [InlineData(ApprovalDecisionType.Approved, null, true)]
    public void Decision_RequiresCommentUnlessApproving(ApprovalDecisionType decision, string? comment, bool valid) =>
        new DecisionRequestValidator().Validate(new DecisionRequest(decision, comment)).IsValid.Should().Be(valid);

    [Fact]
    public void Decision_OutOfRangeEnum_IsInvalid() =>
        new DecisionRequestValidator().Validate(new DecisionRequest((ApprovalDecisionType)42, "x")).IsValid.Should().BeFalse();
}
