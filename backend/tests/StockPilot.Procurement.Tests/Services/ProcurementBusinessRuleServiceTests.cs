using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using StockPilot.Procurement.Application.Dtos.Rules;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Tests.TestHelpers;

namespace StockPilot.Procurement.Tests.Services;

public class ProcurementBusinessRuleServiceTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid SupplierId = Guid.NewGuid();
    private static readonly Guid ProductId = Guid.NewGuid();
    private static readonly Guid QuotationId = Guid.NewGuid();

    private readonly InMemoryProposalRepository _proposals = new();
    private readonly FakeProductCatalogService _products = new FakeProductCatalogService().WithProduct(ProductId);
    private readonly FakeSupplierDirectoryService _suppliers = new FakeSupplierDirectoryService()
        .WithSupplier(SupplierId)
        .WithQuotation(QuotationId, SupplierId, DateTimeOffset.UtcNow.AddDays(5), ProductId, 100m);
    private readonly FakeBranchDirectoryService _branches = new FakeBranchDirectoryService().WithBranch(BranchId);

    private ProcurementBusinessRuleService Service => new(_proposals, _products, _suppliers, _branches);

    private static BusinessRuleCheckRequest Request(int quantity = 5, decimal unitPrice = 100m) =>
        new(BranchId, SupplierId, QuotationId, ProductId, quantity, unitPrice);

    [Fact]
    public async Task AllRulesPass_ForValidPurchase()
    {
        var result = await Service.EvaluateAsync(Request());

        result.Passed.Should().BeTrue();
        result.Results.Select(r => r.Rule).Should().BeEquivalentTo(
            ProcurementBusinessRuleService.BranchActive,
            ProcurementBusinessRuleService.SupplierNotBlocked,
            ProcurementBusinessRuleService.QuotationValid,
            ProcurementBusinessRuleService.UnitPriceMatchesQuotation,
            ProcurementBusinessRuleService.ProductActive,
            ProcurementBusinessRuleService.QuantityPositive,
            ProcurementBusinessRuleService.NoDuplicateOpenOrder);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-4)]
    public async Task NonPositiveQuantity_Fails(int quantity)
    {
        var result = await Service.EvaluateAsync(Request(quantity: quantity));

        result.Passed.Should().BeFalse();
        result.Results.Should().ContainSingle(r => !r.Passed).Which.Rule.Should().Be(ProcurementBusinessRuleService.QuantityPositive);
    }

    [Fact]
    public async Task PriceDifferentFromQuotation_Fails()
    {
        var result = await Service.EvaluateAsync(Request(unitPrice: 90m));

        result.Results.Should().ContainSingle(r => !r.Passed).Which.Rule.Should().Be(ProcurementBusinessRuleService.UnitPriceMatchesQuotation);
    }

    [Fact]
    public async Task QuotationForAnotherProduct_Fails()
    {
        _suppliers.WithQuotation(QuotationId, SupplierId, DateTimeOffset.UtcNow.AddDays(5), Guid.NewGuid(), 100m);

        var result = await Service.EvaluateAsync(Request());

        result.Results.Should().Contain(r => r.Rule == ProcurementBusinessRuleService.QuotationValid && !r.Passed && r.Details.Contains("does not cover"));
    }

    [Fact]
    public async Task ConvertedProposalWithUndeliveredOrder_CountsAsDuplicate()
    {
        var proposal = OpenProposal(ProposalStatus.Converted);
        _proposals.Orders.Add(new PurchaseOrder { Id = Guid.NewGuid(), ProposalId = proposal.Id, Status = PurchaseOrderStatus.PartiallyReceived });

        var result = await Service.EvaluateAsync(Request());

        result.Results.Should().Contain(r => r.Rule == ProcurementBusinessRuleService.NoDuplicateOpenOrder && !r.Passed);
    }

    [Theory]
    [InlineData(ProposalStatus.Rejected)]
    [InlineData(ProposalStatus.Converted)]
    public async Task ClosedProposals_AreNotDuplicates(ProposalStatus status)
    {
        var proposal = OpenProposal(status);
        _proposals.Orders.Add(new PurchaseOrder { Id = Guid.NewGuid(), ProposalId = proposal.Id, Status = PurchaseOrderStatus.Received });

        var result = await Service.EvaluateAsync(Request());

        result.Passed.Should().BeTrue();
    }

    [Fact]
    public async Task CheckAvailability_ReportsRemainingWithoutWriting()
    {
        var budgets = new InMemoryBudgetRepository();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        budgets.Budgets.Add(new Budget
        {
            Id = Guid.NewGuid(), BranchId = BranchId, PeriodStart = today.AddDays(-10), PeriodEnd = today.AddDays(10),
            AllocatedAmount = 1_000m, SpentAmount = 700m
        });
        var service = new BudgetService(budgets, _branches, new InMemoryUnitOfWork(), NullLogger<BudgetService>.Instance);

        var within = await service.CheckAvailabilityAsync(BranchId, today, today, 300m);
        var over = await service.CheckAvailabilityAsync(BranchId, today, today, 300.01m);
        var uncovered = await service.CheckAvailabilityAsync(BranchId, today, today.AddDays(30), 1m);

        within.Allowed.Should().BeTrue();
        within.RemainingAmount.Should().Be(300m);
        over.Allowed.Should().BeFalse();
        over.Reason.Should().Contain("exceeds the remaining budget");
        uncovered.Allowed.Should().BeFalse();
        uncovered.BudgetId.Should().BeNull();
        budgets.Budgets.Single().SpentAmount.Should().Be(700m);
        await FluentActions.Awaiting(() => service.CheckAvailabilityAsync(BranchId, today, today, 0m))
            .Should().ThrowAsync<ProcurementValidationException>();
    }

    private ProcurementProposal OpenProposal(ProposalStatus status)
    {
        var proposal = new ProcurementProposal
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            SupplierId = SupplierId,
            Status = status,
            CreatedAt = DateTimeOffset.UtcNow,
            LineItems = [new ProposalLineItem { Id = Guid.NewGuid(), ProductId = ProductId, Quantity = 1, UnitPrice = 100m, LineTotal = 100m }]
        };
        _proposals.Proposals.Add(proposal);
        return proposal;
    }
}
