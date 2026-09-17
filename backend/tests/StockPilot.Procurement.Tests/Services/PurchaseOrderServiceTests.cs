using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Tests.TestHelpers;
using Xunit;

namespace StockPilot.Procurement.Tests.Services;

public class PurchaseOrderServiceTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid SupplierId = Guid.NewGuid();
    private static readonly Guid ProductId = Guid.NewGuid();

    private readonly InMemoryPurchaseOrderRepository _orders = new();
    private readonly InMemoryProposalRepository _proposals = new();
    private readonly InMemoryBudgetRepository _budgets = new();
    private readonly FakeInventoryStockUpdater _inventory = new();

    private PurchaseOrderService BuildService(Guid userId, params string[] roles) => new(
        _orders,
        _proposals,
        _budgets,
        _inventory,
        new FakeCurrentUserService(userId, roles),
        new InMemoryUnitOfWork(),
        NullLogger<PurchaseOrderService>.Instance);

    private Budget SeedBudget(decimal allocated, decimal spent = 0m)
    {
        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
            AllocatedAmount = allocated,
            SpentAmount = spent
        };
        _budgets.Budgets.Add(budget);
        return budget;
    }

    private ProcurementProposal SeedApprovedProposal(decimal unitPrice = 100m, int quantity = 10)
    {
        var proposal = new ProcurementProposal
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            SupplierId = SupplierId,
            CreatedByUserId = Guid.NewGuid(),
            Status = ProposalStatus.Approved,
            TotalEstimatedCost = unitPrice * quantity,
            LineItems = [new ProposalLineItem { Id = Guid.NewGuid(), ProductId = ProductId, Quantity = quantity, UnitPrice = unitPrice, LineTotal = unitPrice * quantity }],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _proposals.Proposals.Add(proposal);
        return proposal;
    }

    [Fact]
    public async Task ConvertProposalAsync_NotApproved_ThrowsConflict()
    {
        var proposal = SeedApprovedProposal();
        proposal.Status = ProposalStatus.PendingApproval;
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        var act = () => service.ConvertProposalAsync(proposal.Id, CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task ConvertProposalAsync_Approved_CreatesOrderCommitsBudgetAndMarksConverted()
    {
        var budget = SeedBudget(10_000m);
        var proposal = SeedApprovedProposal(unitPrice: 100m, quantity: 10); // 1000
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        var order = await service.ConvertProposalAsync(proposal.Id, CancellationToken.None);

        order.Status.Should().Be(PurchaseOrderStatus.Ordered);
        order.TotalCost.Should().Be(1000m);
        proposal.Status.Should().Be(ProposalStatus.Converted);
        budget.SpentAmount.Should().Be(1000m);
    }

    [Fact]
    public async Task ConvertProposalAsync_CalledTwice_SecondCallThrowsConflict()
    {
        SeedBudget(10_000m);
        var proposal = SeedApprovedProposal();
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        await service.ConvertProposalAsync(proposal.Id, CancellationToken.None);
        var act = () => service.ConvertProposalAsync(proposal.Id, CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task ConvertProposalAsync_ExceedsRemainingBudget_ThrowsBudgetExceeded()
    {
        SeedBudget(500m);
        var proposal = SeedApprovedProposal(unitPrice: 100m, quantity: 10); // 1000
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        var act = () => service.ConvertProposalAsync(proposal.Id, CancellationToken.None);

        await act.Should().ThrowAsync<BudgetExceededException>();
    }

    private async Task<PurchaseOrder> SeedOrderedOrderAsync()
    {
        SeedBudget(10_000m, spent: 1000m);
        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            ProposalId = Guid.NewGuid(),
            SupplierId = SupplierId,
            OrderNumber = "PO-2026-000001",
            Status = PurchaseOrderStatus.Ordered,
            TotalCost = 1000m,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Proposal = new ProcurementProposal { Id = Guid.NewGuid(), BranchId = BranchId, SupplierId = SupplierId, Status = ProposalStatus.Converted, TotalEstimatedCost = 1000m },
            LineItems = [new PurchaseOrderLineItem { Id = Guid.NewGuid(), ProductId = ProductId, Quantity = 10, UnitPrice = 100m }]
        };
        _orders.Orders.Add(order);
        return await Task.FromResult(order);
    }

    [Fact]
    public async Task UpdateStatusAsync_ReceivedFromOrdered_NotifiesInventory()
    {
        var order = await SeedOrderedOrderAsync();
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        var result = await service.UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(PurchaseOrderStatus.Received, "All items received."), CancellationToken.None);

        result.Status.Should().Be(PurchaseOrderStatus.Received);
        _inventory.Calls.Should().ContainSingle(c => c.ProductId == ProductId && c.Quantity == 10);
    }

    [Fact]
    public async Task UpdateStatusAsync_CancelFromOrdered_ReleasesBudget()
    {
        var order = await SeedOrderedOrderAsync();
        var budget = _budgets.Budgets.Single();
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        await service.UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(PurchaseOrderStatus.Cancelled, "Supplier could not fulfil."), CancellationToken.None);

        budget.SpentAmount.Should().Be(0m);
    }

    [Fact]
    public async Task UpdateStatusAsync_FromReceived_ThrowsInvalidTransition()
    {
        var order = await SeedOrderedOrderAsync();
        order.Status = PurchaseOrderStatus.Received;
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);

        var act = () => service.UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(PurchaseOrderStatus.Ordered, null), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStateTransitionException>();
    }
}
