using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Tests.TestHelpers;

namespace StockPilot.Procurement.Tests.Services;

/// <summary>Budget math, approval-limit enforcement and proposal status transitions in ProcurementProposalService.</summary>
public class ProposalApprovalRulesTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid SupplierId = Guid.NewGuid();
    private static readonly Guid ProductA = Guid.NewGuid();
    private static readonly Guid ProductB = Guid.NewGuid();
    private static readonly Guid OwnerId = Guid.NewGuid();

    private readonly InMemoryProposalRepository _proposals = new();
    private readonly InMemoryBudgetRepository _budgets = new();
    private readonly FakeProductCatalogService _products = new FakeProductCatalogService().WithProduct(ProductA).WithProduct(ProductB);
    private readonly FakeSupplierDirectoryService _suppliers = new FakeSupplierDirectoryService().WithSupplier(SupplierId);
    private readonly FakeBranchDirectoryService _branches = new FakeBranchDirectoryService().WithBranch(BranchId);

    private ProcurementProposalService Service(Guid userId, params string[] roles) => new(
        _proposals, _budgets, _products, _suppliers, _branches,
        new FakeCurrentUserService(userId, roles),
        new InMemoryUnitOfWork(),
        Options.Create(new ApprovalLimitOptions { ProcurementManager = 50_000m, BusinessOwner = null }),
        NullLogger<ProcurementProposalService>.Instance);

    private ProcurementProposalService Manager => Service(Guid.NewGuid(), ProcurementRoles.ProcurementManager);
    private ProcurementProposalService Owner => Service(OwnerId, ProcurementRoles.BranchManager);

    private void SeedBudget(decimal allocated, decimal spent = 0m) => _budgets.Budgets.Add(new Budget
    {
        Id = Guid.NewGuid(),
        BranchId = BranchId,
        PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
        PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
        AllocatedAmount = allocated,
        SpentAmount = spent
    });

    private static CreateProposalRequest Request(params (Guid Product, int Qty, decimal Price)[] lines) => new(
        BranchId, SupplierId, null, "Restock", false,
        lines.Select(l => new ProposalLineItemRequest(l.Product, l.Qty, l.Price)).ToList());

    private async Task<Guid> PendingProposal(decimal total)
    {
        SeedBudget(1_000_000m);
        var created = await Owner.CreateAsync(Request((ProductA, 1, total)));
        return created.Id;
    }

    // ── Budget check math ────────────────────────────────────────────────────

    [Fact]
    public async Task Total_IsSumOfQuantityTimesUnitPrice_AcrossLines()
    {
        SeedBudget(100_000m);

        var result = await Owner.CreateAsync(Request((ProductA, 3, 19.99m), (ProductB, 12, 250.50m)));

        result.TotalEstimatedCost.Should().Be(3 * 19.99m + 12 * 250.50m);
        result.LineItems.Select(li => li.LineTotal).Should().BeEquivalentTo([59.97m, 3006.00m]);
    }

    [Fact]
    public async Task Cost_ExactlyEqualToRemainingBudget_IsAllowed()
    {
        SeedBudget(allocated: 10_000m, spent: 7_500m);

        var result = await Owner.CreateAsync(Request((ProductA, 10, 250m)));

        result.TotalEstimatedCost.Should().Be(2_500m);
    }

    [Fact]
    public async Task Cost_OneCentOverRemainingBudget_IsRejected()
    {
        SeedBudget(allocated: 10_000m, spent: 7_500m);

        var act = () => Owner.CreateAsync(Request((ProductA, 1, 2_500.01m)));

        var thrown = (await act.Should().ThrowAsync<BudgetExceededException>()).Which;
        thrown.Requested.Should().Be(2_500.01m);
        thrown.Remaining.Should().Be(2_500m);
        _proposals.Proposals.Should().BeEmpty();
    }

    [Fact]
    public async Task RemainingBudget_UsesCommittedSpend_NotOtherPendingProposals()
    {
        SeedBudget(allocated: 1_000m);
        await Owner.CreateAsync(Request((ProductA, 1, 900m)));

        // The first proposal is only pending, so it does not reserve budget.
        var second = await Owner.CreateAsync(Request((ProductB, 1, 900m)));

        second.Status.Should().Be(ProposalStatus.PendingApproval);
    }

    [Fact]
    public async Task BudgetOutsideTodaysPeriod_IsNotUsed()
    {
        _budgets.Budgets.Add(new Budget
        {
            Id = Guid.NewGuid(), BranchId = BranchId,
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-2),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-1),
            AllocatedAmount = 1_000_000m
        });

        var act = () => Owner.CreateAsync(Request((ProductA, 1, 10m)));

        await act.Should().ThrowAsync<ProcurementValidationException>().WithMessage("*No active budget*");
    }

    // ── Approval-limit enforcement ───────────────────────────────────────────

    [Theory]
    [InlineData(ProcurementRoles.ProcurementManager, 50_000, true)]
    [InlineData(ProcurementRoles.ProcurementManager, 50_000.01, false)]
    [InlineData(ProcurementRoles.BusinessOwner, 999_999, true)]
    public async Task Approve_RespectsRoleLimit(string role, double amount, bool allowed)
    {
        var id = await PendingProposal((decimal)amount);
        var act = () => Service(Guid.NewGuid(), role).DecideAsync(id, new DecisionRequest(ApprovalDecisionType.Approved, null));

        if (allowed)
        {
            (await act()).Status.Should().Be(ProposalStatus.Approved);
        }
        else
        {
            await act.Should().ThrowAsync<ApprovalLimitExceededException>();
            (await Manager.GetByIdAsync(id)).Status.Should().Be(ProposalStatus.PendingApproval);
        }
    }

    [Theory]
    [InlineData(ProcurementRoles.BranchManager)]
    [InlineData(ProcurementRoles.StoreEmployee)]
    public async Task Approve_ByRoleWithoutApprovalRights_IsForbidden(string role)
    {
        var id = await PendingProposal(10m);

        var act = () => Service(Guid.NewGuid(), role).DecideAsync(id, new DecisionRequest(ApprovalDecisionType.Approved, null));

        await act.Should().ThrowAsync<ProcurementForbiddenException>();
    }

    [Fact]
    public async Task Reject_IsNotCappedByApprovalLimit()
    {
        var id = await PendingProposal(75_000m);

        var result = await Manager.DecideAsync(id, new DecisionRequest(ApprovalDecisionType.Rejected, "Too expensive"));

        result.Status.Should().Be(ProposalStatus.Rejected);
    }

    [Theory]
    [InlineData(new[] { ProcurementRoles.BranchManager, ProcurementRoles.ProcurementManager }, 50_000.0)]
    [InlineData(new[] { ProcurementRoles.ProcurementManager, ProcurementRoles.BusinessOwner }, null)]
    [InlineData(new[] { ProcurementRoles.BranchManager }, 0.0)]
    [InlineData(new string[0], 0.0)]
    public void HighestLimit_AcrossRoles(string[] roles, double? expected)
    {
        var options = new ApprovalLimitOptions { ProcurementManager = 50_000m, BusinessOwner = null };

        options.GetHighestLimit(roles).Should().Be(expected is null ? null : (decimal)expected.Value);
    }

    // ── Status transitions ───────────────────────────────────────────────────

    [Theory]
    [InlineData(ApprovalDecisionType.Approved, ProposalStatus.Approved)]
    [InlineData(ApprovalDecisionType.Rejected, ProposalStatus.Rejected)]
    [InlineData(ApprovalDecisionType.RevisionRequested, ProposalStatus.RevisionRequested)]
    public async Task Decision_MovesPendingProposalToMatchingStatus_AndRecordsIt(ApprovalDecisionType decision, ProposalStatus expected)
    {
        var id = await PendingProposal(100m);
        var managerId = Guid.NewGuid();

        var result = await Service(managerId, ProcurementRoles.ProcurementManager).DecideAsync(id, new DecisionRequest(decision, "note"));

        result.Status.Should().Be(expected);
        result.ApprovalDecisions.Should().ContainSingle(d => d.Decision == decision && d.DecidedByUserId == managerId && d.Comment == "note");
    }

    [Theory]
    [InlineData(ApprovalDecisionType.Approved)]
    [InlineData(ApprovalDecisionType.Rejected)]
    public async Task DecidedProposal_CannotBeDecidedAgain(ApprovalDecisionType first)
    {
        var id = await PendingProposal(100m);
        await Manager.DecideAsync(id, new DecisionRequest(first, "first"));

        var act = () => Manager.DecideAsync(id, new DecisionRequest(ApprovalDecisionType.Approved, null));

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task DraftProposal_CannotBeDecided()
    {
        SeedBudget(10_000m);
        var draft = await Owner.CreateAsync(Request((ProductA, 1, 10m)) with { SubmitForApproval = false });

        var act = () => Manager.DecideAsync(draft.Id, new DecisionRequest(ApprovalDecisionType.Approved, null));

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task RevisionRequested_CanBeEditedAndResubmitted_ThenApproved()
    {
        var id = await PendingProposal(100m);
        await Manager.DecideAsync(id, new DecisionRequest(ApprovalDecisionType.RevisionRequested, "Lower the quantity"));

        var revised = await Owner.UpdateAsync(id, new UpdateProposalRequest(SupplierId, null, "Revised", [new ProposalLineItemRequest(ProductA, 1, 80m)]));
        var approved = await Manager.DecideAsync(id, new DecisionRequest(ApprovalDecisionType.Approved, null));

        revised.Status.Should().Be(ProposalStatus.PendingApproval);
        revised.TotalEstimatedCost.Should().Be(80m);
        approved.Status.Should().Be(ProposalStatus.Approved);
        approved.ApprovalDecisions.Should().HaveCount(2);
    }

    [Theory]
    [InlineData(ApprovalDecisionType.Rejected)]
    [InlineData(ApprovalDecisionType.Approved)]
    public async Task DecidedProposal_CannotBeEdited(ApprovalDecisionType decision)
    {
        var id = await PendingProposal(100m);
        await Manager.DecideAsync(id, new DecisionRequest(decision, "done"));

        var act = () => Owner.UpdateAsync(id, new UpdateProposalRequest(SupplierId, null, null, [new ProposalLineItemRequest(ProductA, 1, 1m)]));

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }
}
