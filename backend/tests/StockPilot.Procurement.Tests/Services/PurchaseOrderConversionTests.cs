using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Tests.TestHelpers;

namespace StockPilot.Procurement.Tests.Services;

/// <summary>Conversion-to-PO logic and the full purchase order transition matrix.</summary>
public class PurchaseOrderConversionTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid SupplierId = Guid.NewGuid();
    private static readonly Guid ManagerId = Guid.NewGuid();

    private readonly InMemoryProposalRepository _proposals = new();
    private readonly InMemoryPurchaseOrderRepository _orders = new();
    private readonly InMemoryBudgetRepository _budgets = new();
    private readonly FakeInventoryStockUpdater _inventory = new();

    private PurchaseOrderService Service(params string[] roles) => new(
        _orders, _proposals, _budgets, _inventory,
        new FakeCurrentUserService(ManagerId, roles.Length > 0 ? roles : [ProcurementRoles.ProcurementManager]),
        new InMemoryUnitOfWork(),
        NullLogger<PurchaseOrderService>.Instance);

    private Budget SeedBudget(decimal allocated = 100_000m, decimal spent = 0m)
    {
        var budget = new Budget
        {
            Id = Guid.NewGuid(), BranchId = BranchId,
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
            AllocatedAmount = allocated, SpentAmount = spent
        };
        _budgets.Budgets.Add(budget);
        return budget;
    }

    private ProcurementProposal ApprovedProposal(params (int Qty, decimal Price)[] lines)
    {
        var proposal = new ProcurementProposal
        {
            Id = Guid.NewGuid(), BranchId = BranchId, SupplierId = SupplierId,
            Status = ProposalStatus.Approved, CreatedAt = DateTimeOffset.UtcNow,
            LineItems = lines.Select(l => new ProposalLineItem
            {
                Id = Guid.NewGuid(), ProductId = Guid.NewGuid(), Quantity = l.Qty, UnitPrice = l.Price, LineTotal = l.Qty * l.Price
            }).ToList()
        };
        proposal.TotalEstimatedCost = proposal.LineItems.Sum(li => li.LineTotal);
        _proposals.Proposals.Add(proposal);
        return proposal;
    }

    private PurchaseOrder SeedOrder(PurchaseOrderStatus status, decimal total = 1_000m)
    {
        var proposal = ApprovedProposal((1, total));
        proposal.Status = ProposalStatus.Converted;
        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(), ProposalId = proposal.Id, Proposal = proposal, SupplierId = SupplierId,
            OrderNumber = $"PO-T-{_orders.Orders.Count + 1}", Status = status, TotalCost = total,
            CreatedAt = DateTimeOffset.UtcNow,
            LineItems = proposal.LineItems.Select(li => new PurchaseOrderLineItem
            {
                Id = Guid.NewGuid(), ProductId = li.ProductId, Quantity = li.Quantity, UnitPrice = li.UnitPrice
            }).ToList()
        };
        _orders.Orders.Add(order);
        return order;
    }

    [Fact]
    public async Task Convert_CopiesEveryLine_AndRecordsInitialHistory()
    {
        SeedBudget();
        var proposal = ApprovedProposal((3, 10m), (2, 45.50m));

        var order = await Service().ConvertProposalAsync(proposal.Id);

        order.ProposalId.Should().Be(proposal.Id);
        order.SupplierId.Should().Be(SupplierId);
        order.Status.Should().Be(PurchaseOrderStatus.Ordered);
        order.TotalCost.Should().Be(121m);
        order.OrderNumber.Should().MatchRegex(@"^PO-\d{4}-\d{6}$");
        order.LineItems.Select(li => (li.ProductId, li.Quantity, li.UnitPrice))
            .Should().BeEquivalentTo(proposal.LineItems.Select(li => (li.ProductId, li.Quantity, li.UnitPrice)));
        order.StatusHistory.Should().ContainSingle(h => h.FromStatus == null && h.ToStatus == PurchaseOrderStatus.Ordered && h.ChangedByUserId == ManagerId);
    }

    [Fact]
    public async Task Convert_CommitsExactCostToBudget()
    {
        var budget = SeedBudget(allocated: 10_000m, spent: 2_000m);
        var proposal = ApprovedProposal((4, 1_999.99m));

        await Service().ConvertProposalAsync(proposal.Id);

        budget.SpentAmount.Should().Be(2_000m + 7_999.96m);
        budget.RemainingAmount.Should().Be(0.04m);
        proposal.Status.Should().Be(ProposalStatus.Converted);
    }

    [Fact]
    public async Task Convert_WithExactlyRemainingBudget_Succeeds()
    {
        var budget = SeedBudget(allocated: 5_000m, spent: 4_000m);
        var proposal = ApprovedProposal((1, 1_000m));

        await Service().ConvertProposalAsync(proposal.Id);

        budget.RemainingAmount.Should().Be(0m);
    }

    [Fact]
    public async Task Convert_WithoutActiveBudget_IsRejected_AndNothingChanges()
    {
        var proposal = ApprovedProposal((1, 10m));

        var act = () => Service().ConvertProposalAsync(proposal.Id);

        await act.Should().ThrowAsync<ProcurementValidationException>();
        proposal.Status.Should().Be(ProposalStatus.Approved);
        _orders.Orders.Should().BeEmpty();
    }

    [Theory]
    [InlineData(ProposalStatus.Draft)]
    [InlineData(ProposalStatus.PendingApproval)]
    [InlineData(ProposalStatus.Rejected)]
    [InlineData(ProposalStatus.RevisionRequested)]
    [InlineData(ProposalStatus.Converted)]
    public async Task Convert_RequiresApprovedStatus(ProposalStatus status)
    {
        SeedBudget();
        var proposal = ApprovedProposal((1, 10m));
        proposal.Status = status;

        var act = () => Service().ConvertProposalAsync(proposal.Id);

        await act.Should().ThrowAsync<ProcurementConflictException>();
        _orders.Orders.Should().BeEmpty();
    }

    [Fact]
    public async Task Convert_UnknownProposal_IsNotFound()
    {
        var act = () => Service().ConvertProposalAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<ProcurementNotFoundException>();
    }

    public static TheoryData<PurchaseOrderStatus, PurchaseOrderStatus, bool> TransitionMatrix()
    {
        var allowed = new HashSet<(PurchaseOrderStatus, PurchaseOrderStatus)>
        {
            (PurchaseOrderStatus.Ordered, PurchaseOrderStatus.PartiallyReceived),
            (PurchaseOrderStatus.Ordered, PurchaseOrderStatus.Received),
            (PurchaseOrderStatus.Ordered, PurchaseOrderStatus.Cancelled),
            (PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Received),
            (PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Cancelled)
        };
        var data = new TheoryData<PurchaseOrderStatus, PurchaseOrderStatus, bool>();
        foreach (var from in Enum.GetValues<PurchaseOrderStatus>())
        {
            foreach (var to in Enum.GetValues<PurchaseOrderStatus>())
            {
                data.Add(from, to, allowed.Contains((from, to)));
            }
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(TransitionMatrix))]
    public async Task OrderStatus_FollowsTransitionMatrix(PurchaseOrderStatus from, PurchaseOrderStatus to, bool allowed)
    {
        SeedBudget();
        var order = SeedOrder(from);

        var act = () => Service().UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(to, null));

        if (allowed)
        {
            (await act()).Status.Should().Be(to);
            order.StatusHistory.Should().ContainSingle(h => h.FromStatus == from && h.ToStatus == to);
        }
        else
        {
            await act.Should().ThrowAsync<InvalidStateTransitionException>();
            order.Status.Should().Be(from);
        }
    }

    [Fact]
    public async Task PartiallyReceived_DoesNotNotifyInventory_ButReceivedDoes()
    {
        SeedBudget();
        var order = SeedOrder(PurchaseOrderStatus.Ordered);

        await Service(ProcurementRoles.StoreEmployee).UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(PurchaseOrderStatus.PartiallyReceived, "half"));
        _inventory.Calls.Should().BeEmpty();

        await Service(ProcurementRoles.StoreEmployee).UpdateStatusAsync(order.Id, new UpdateOrderStatusRequest(PurchaseOrderStatus.Received, "rest"));
        _inventory.Calls.Should().ContainSingle(c => c.BranchId == BranchId && c.PurchaseOrderId == order.Id);
    }
}
