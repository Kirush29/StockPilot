using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Infrastructure.Persistence;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;
using StockPilot.Procurement.Infrastructure.Repositories;

namespace StockPilot.Procurement.Tests.Integration;

/// <summary>Shared setup for the PostgreSQL integration tests: isolated branches, budgets and proposals.</summary>
public abstract class ProcurementIntegrationTestBase(PostgresProcurementFixture db)
{
    protected PostgresProcurementFixture Db { get; } = db;

    protected static readonly Guid ManagerId = SeedIds.UserProcurementManager;

    /// <summary>An isolated branch with its own budget, so tests in this class don't affect each other.</summary>
    protected async Task<(Guid BranchId, Guid BudgetId)> NewBranchWithBudget(decimal allocated, decimal spent = 0m)
    {
        var branchId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var budget = new Budget
        {
            Id = Guid.NewGuid(), BranchId = branchId,
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
            AllocatedAmount = allocated, SpentAmount = spent, CreatedAt = now, UpdatedAt = now
        };
        await using var context = Db.NewContext();
        context.Budgets.Add(budget);
        await context.SaveChangesAsync();
        return (branchId, budget.Id);
    }

    protected async Task<Guid> NewProposal(Guid branchId, ProposalStatus status, params (Guid Product, int Qty, decimal Price)[] lines)
    {
        var now = DateTimeOffset.UtcNow;
        var proposal = new ProcurementProposal
        {
            Id = Guid.NewGuid(), BranchId = branchId, SupplierId = SeedIds.Supplier, QuotationId = SeedIds.Quotation,
            CreatedByUserId = SeedIds.UserBranchManager, Status = status, CreatedAt = now, UpdatedAt = now,
            LineItems = lines.Select(l => new ProposalLineItem
            {
                Id = Guid.NewGuid(), ProductId = l.Product, Quantity = l.Qty, UnitPrice = l.Price, LineTotal = l.Qty * l.Price,
                CreatedAt = now, UpdatedAt = now
            }).ToList()
        };
        proposal.TotalEstimatedCost = proposal.LineItems.Sum(li => li.LineTotal);
        await using var context = Db.NewContext();
        context.Proposals.Add(proposal);
        await context.SaveChangesAsync();
        return proposal.Id;
    }

    protected async Task<(ProposalStatus Status, int Decisions, decimal Spent, int Orders)> Snapshot(Guid proposalId, Guid budgetId)
    {
        await using var context = Db.NewContext();
        var proposal = await context.Proposals.AsNoTracking().Include(p => p.ApprovalDecisions).SingleAsync(p => p.Id == proposalId);
        var budget = await context.Budgets.AsNoTracking().SingleAsync(b => b.Id == budgetId);
        var orders = await context.PurchaseOrders.CountAsync(o => o.ProposalId == proposalId);
        return (proposal.Status, proposal.ApprovalDecisions.Count, budget.SpentAmount, orders);
    }
}

/// <summary>
/// EF Core against real PostgreSQL. Every assertion re-reads through a fresh DbContext, so it
/// checks what was committed, not what the change tracker holds.
///
/// Note on the flow: in this codebase approving a proposal (ProcurementProposalService.DecideAsync)
/// records the decision and the status change in one transaction and does not touch the budget.
/// Budget.SpentAmount is committed when an Approved proposal is converted
/// (PurchaseOrderService.ConvertProposalAsync), in the same transaction that creates the
/// purchase order and marks the proposal Converted. Both transactions are covered here.
/// </summary>
public class ProcurementTransactionIntegrationTests(PostgresProcurementFixture db)
    : ProcurementIntegrationTestBase(db), IClassFixture<PostgresProcurementFixture>
{
    [PostgresFact]
    public async Task Migrations_ApplySeedData()
    {
        await using var context = Db.NewContext();

        (await context.Budgets.SingleAsync(b => b.Id == SeedIds.Budget)).AllocatedAmount.Should().Be(500_000m);
        (await context.PurchaseOrders.SingleAsync(o => o.Id == SeedIds.PurchaseOrder)).OrderNumber.Should().Be("PO-2026-000001");
    }

    [PostgresFact]
    public async Task Approve_CommitsDecisionAndStatusTogether_AndLeavesBudgetUntouched()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m, spent: 1_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.PendingApproval, (SeedIds.ProductPaper, 4, 500m));

        await using (var context = Db.NewContext())
        {
            await Db.ProposalService(context, ManagerId).DecideAsync(proposalId, new DecisionRequest(ApprovalDecisionType.Approved, "OK"));
        }

        var after = await Snapshot(proposalId, budgetId);
        after.Status.Should().Be(ProposalStatus.Approved);
        after.Decisions.Should().Be(1);
        after.Spent.Should().Be(1_000m, "approval alone does not commit spend");
        after.Orders.Should().Be(0);
    }

    [PostgresFact]
    public async Task Approve_ThenConvert_CommitsOrderStatusAndSpentAmountAtomically()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m, spent: 1_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.PendingApproval, (SeedIds.ProductPaper, 4, 500m), (SeedIds.ProductInk, 3, 199.99m));

        await using (var context = Db.NewContext())
        {
            await Db.ProposalService(context, ManagerId).DecideAsync(proposalId, new DecisionRequest(ApprovalDecisionType.Approved, null));
        }

        await using (var context = Db.NewContext())
        {
            await Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId);
        }

        var after = await Snapshot(proposalId, budgetId);
        after.Status.Should().Be(ProposalStatus.Converted);
        after.Spent.Should().Be(1_000m + 2_000m + 599.97m);
        after.Orders.Should().Be(1);

        await using var verify = Db.NewContext();
        var order = await verify.PurchaseOrders.AsNoTracking().Include(o => o.LineItems).Include(o => o.StatusHistory)
            .SingleAsync(o => o.ProposalId == proposalId);
        order.TotalCost.Should().Be(2_599.97m);
        order.LineItems.Should().HaveCount(2);
        order.StatusHistory.Should().ContainSingle(h => h.ToStatus == PurchaseOrderStatus.Ordered);
    }

    [PostgresFact]
    public async Task Convert_OverRemainingBudget_WritesNothing()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(1_000m, spent: 900m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 100.01m));

        await using (var context = Db.NewContext())
        {
            var act = () => Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId);
            await act.Should().ThrowAsync<BudgetExceededException>();
        }

        var after = await Snapshot(proposalId, budgetId);
        (after.Status, after.Spent, after.Orders).Should().Be((ProposalStatus.Approved, 900m, 0));
    }

    [PostgresFact]
    public async Task CancellingOrder_RefundsBudget_InSameTransaction()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 3, 100m));
        Guid orderId;
        await using (var context = Db.NewContext())
        {
            orderId = (await Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId)).Id;
        }

        await using (var context = Db.NewContext())
        {
            await Db.OrderService(context, ManagerId).UpdateStatusAsync(orderId,
                new StockPilot.Procurement.Application.Dtos.Orders.UpdateOrderStatusRequest(PurchaseOrderStatus.Cancelled, "supplier out of stock"));
        }

        var after = await Snapshot(proposalId, budgetId);
        after.Spent.Should().Be(0m);
        await using var verify = Db.NewContext();
        (await verify.PurchaseOrders.AsNoTracking().SingleAsync(o => o.Id == orderId)).Status.Should().Be(PurchaseOrderStatus.Cancelled);
    }

    [PostgresFact]
    public async Task CheckConstraint_RejectsUnknownStatus_WrittenOutsideTheApi()
    {
        var (branchId, _) = await NewBranchWithBudget(1_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Draft, (SeedIds.ProductPaper, 1, 1m));
        await using var context = Db.NewContext();

        var act = () => context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE procurement.\"ProcurementProposals\" SET \"Status\" = 'AutoApproved' WHERE \"Id\" = {proposalId}");

        (await act.Should().ThrowAsync<PostgresException>()).Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
    }

    [PostgresFact]
    public async Task MoneyPrecision_RejectsRunawayAmounts()
    {
        var (branchId, _) = await NewBranchWithBudget(1_000m);

        var act = () => NewProposal(branchId, ProposalStatus.Draft, (SeedIds.ProductPaper, 1, 99_999_999_999m));

        (await act.Should().ThrowAsync<DbUpdateException>())
            .Which.InnerException.Should().BeOfType<PostgresException>().Which.SqlState.Should().Be(PostgresErrorCodes.NumericValueOutOfRange);
    }

    [PostgresFact]
    public async Task OpenProposalLookup_TranslatesToSql_AndMatchesOpenNeedsOnly()
    {
        var (branchId, _) = await NewBranchWithBudget(10_000m);
        var product = SeedIds.ProductChair;
        var rejected = await NewProposal(branchId, ProposalStatus.Rejected, (product, 1, 1m));
        await using var context = Db.NewContext();
        var repository = new EfProposalRepository(context);

        (await repository.FindOpenProposalForProductAsync(branchId, product)).Should().BeNull("a rejected proposal is not an open need");

        var converted = await NewProposal(branchId, ProposalStatus.Converted, (product, 1, 1m));
        var now = DateTimeOffset.UtcNow;
        context.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = Guid.NewGuid(), ProposalId = converted, SupplierId = SeedIds.Supplier, OrderNumber = $"PO-IT-{Guid.NewGuid():N}"[..20],
            Status = PurchaseOrderStatus.PartiallyReceived, TotalCost = 1m, CreatedAt = now, UpdatedAt = now
        });
        await context.SaveChangesAsync();

        (await repository.FindOpenProposalForProductAsync(branchId, product)).Should().Be(converted, "its order is not fully received");
        (await repository.FindOpenProposalForProductAsync(Guid.NewGuid(), product)).Should().BeNull();
        rejected.Should().NotBe(converted);
    }

    /// <summary>
    /// Two managers convert the same Approved proposal at the same moment. Both read it as
    /// Approved before either commits; the first conversion then finishes before the second
    /// continues. Only one purchase order and one budget commit should result.
    /// </summary>
    [PostgresFact]
    public async Task ConcurrentConversions_OfSameProposal_ProduceOneOrder()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 1_000m));
        var bothLoaded = new Barrier(2);
        var firstDone = new TaskCompletionSource();

        async Task<Exception?> Convert(bool first)
        {
            await using var context = Db.NewContext();
            var hook = new PauseAfterLoad(bothLoaded, first ? null : firstDone.Task);
            try
            {
                await Db.OrderService(context, ManagerId, hook).ConvertProposalAsync(proposalId);
                return null;
            }
            catch (Exception ex)
            {
                return ex;
            }
            finally
            {
                if (first) firstDone.TrySetResult();
            }
        }

        var results = await Task.WhenAll(Task.Run(() => Convert(true)), Task.Run(() => Convert(false)));

        results[0].Should().BeNull("the first conversion commits");
        results[1].Should().BeOfType<ProcurementConflictException>(
            "the second worked from a stale read of the proposal and must be refused (HTTP 409)");
        var after = await Snapshot(proposalId, budgetId);
        after.Orders.Should().Be(1);
        after.Spent.Should().Be(1_000m);
    }

    [PostgresFact]
    public async Task ConcurrentConversions_InDifferentBranches_BothSucceed_WithDistinctOrderNumbers()
    {
        var a = await NewBranchWithBudget(10_000m);
        var b = await NewBranchWithBudget(10_000m);
        var proposalA = await NewProposal(a.BranchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 100m));
        var proposalB = await NewProposal(b.BranchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 200m));

        async Task<string> Convert(Guid proposalId)
        {
            await using var context = Db.NewContext();
            return (await Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId)).OrderNumber;
        }

        var numbers = await Task.WhenAll(Task.Run(() => Convert(proposalA)), Task.Run(() => Convert(proposalB)));

        numbers.Should().OnlyHaveUniqueItems();
        (await Snapshot(proposalA, a.BudgetId)).Spent.Should().Be(100m);
        (await Snapshot(proposalB, b.BudgetId)).Spent.Should().Be(200m);
    }

    /// <summary>
    /// Two different proposals of the same branch convert at the same moment, both having read the
    /// budget before either commits. Without a concurrency check the second write overwrote the
    /// first and the budget recorded only one of the two orders.
    /// </summary>
    [PostgresFact]
    public async Task ConcurrentConversions_SharingABudget_NeverLoseASpendUpdate()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m);
        var first = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 1_000m));
        var second = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductInk, 1, 2_000m));
        var bothLoaded = new Barrier(2);
        var firstDone = new TaskCompletionSource();

        async Task<Exception?> Convert(Guid proposalId, bool isFirst)
        {
            await using var context = Db.NewContext();
            // Load the budget before the barrier so both conversions hold the same stale SpentAmount.
            await context.Budgets.SingleAsync(x => x.Id == budgetId);
            var hook = new PauseAfterLoad(bothLoaded, isFirst ? null : firstDone.Task);
            try
            {
                await Db.OrderService(context, ManagerId, hook).ConvertProposalAsync(proposalId);
                return null;
            }
            catch (Exception ex)
            {
                return ex;
            }
            finally
            {
                if (isFirst) firstDone.TrySetResult();
            }
        }

        var results = await Task.WhenAll(Task.Run(() => Convert(first, true)), Task.Run(() => Convert(second, false)));

        results[0].Should().BeNull();
        results[1].Should().BeOfType<ProcurementConflictException>();
        (await Snapshot(first, budgetId)).Spent.Should().Be(1_000m, "only the committed conversion is counted, exactly once");
        (await Snapshot(second, budgetId)).Status.Should().Be(ProposalStatus.Approved, "the refused conversion can simply be retried");

        await using (var context = Db.NewContext())
        {
            await Db.OrderService(context, ManagerId).ConvertProposalAsync(second);
        }

        (await Snapshot(second, budgetId)).Spent.Should().Be(3_000m);
    }

    [PostgresFact]
    public async Task ConcurrentDecisions_OnSameProposal_RecordOnlyOne()
    {
        var (branchId, _) = await NewBranchWithBudget(10_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.PendingApproval, (SeedIds.ProductPaper, 1, 100m));
        await using var contextA = Db.NewContext();
        await using var contextB = Db.NewContext();
        // Both managers have the proposal open while it is still pending.
        await contextA.Proposals.Include(p => p.ApprovalDecisions).SingleAsync(p => p.Id == proposalId);
        await contextB.Proposals.Include(p => p.ApprovalDecisions).SingleAsync(p => p.Id == proposalId);

        await Db.ProposalService(contextA, Guid.NewGuid()).DecideAsync(proposalId, new DecisionRequest(ApprovalDecisionType.Approved, "A"));
        var act = () => Db.ProposalService(contextB, Guid.NewGuid()).DecideAsync(proposalId, new DecisionRequest(ApprovalDecisionType.Rejected, "B"));

        await act.Should().ThrowAsync<ProcurementConflictException>();
        await using var verify = Db.NewContext();
        var saved = await verify.Proposals.AsNoTracking().Include(p => p.ApprovalDecisions).SingleAsync(p => p.Id == proposalId);
        saved.Status.Should().Be(ProposalStatus.Approved);
        saved.ApprovalDecisions.Should().ContainSingle(d => d.Comment == "A");
    }

    private sealed class PauseAfterLoad(Barrier bothLoaded, Task? waitFor) : IProposalRepositoryHook
    {
        public IProposalRepository Wrap(IProposalRepository inner) => new Paused(inner, bothLoaded, waitFor);

        private sealed class Paused(IProposalRepository inner, Barrier bothLoaded, Task? waitFor) : IProposalRepository
        {
            public async Task<ProcurementProposal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
            {
                var proposal = await inner.GetByIdAsync(id, cancellationToken);
                bothLoaded.SignalAndWait(TimeSpan.FromSeconds(10));
                if (waitFor is not null) await waitFor.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
                return proposal;
            }

            public Task<(IReadOnlyList<ProcurementProposal> Items, int TotalCount)> QueryAsync(ProposalListQuery query, CancellationToken cancellationToken = default) =>
                inner.QueryAsync(query, cancellationToken);

            public Task AddAsync(ProcurementProposal proposal, CancellationToken cancellationToken = default) => inner.AddAsync(proposal, cancellationToken);

            public Task<Guid?> FindOpenProposalForProductAsync(Guid branchId, Guid productId, CancellationToken cancellationToken = default) =>
                inner.FindOpenProposalForProductAsync(branchId, productId, cancellationToken);
        }
    }
}

/// <summary>
/// Fault injection: a trigger in this class's own database makes the purchase order INSERT fail,
/// after the budget and proposal updates are already part of the same transaction.
/// </summary>
public class ProcurementRollbackIntegrationTests(PostgresProcurementFixture db)
    : ProcurementIntegrationTestBase(db), IClassFixture<PostgresProcurementFixture>
{
    [PostgresFact]
    public async Task Convert_FailingOnCommit_RollsBackBudgetAndStatus()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m, spent: 1_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 2, 500m));
        await using (var context = Db.NewContext())
        {
            await context.Database.ExecuteSqlRawAsync("""
                CREATE FUNCTION procurement.test_reject_purchase_order() RETURNS trigger LANGUAGE plpgsql AS
                $$ BEGIN RAISE EXCEPTION 'injected failure on purchase order insert'; END $$;
                CREATE TRIGGER test_reject_purchase_order BEFORE INSERT ON procurement."PurchaseOrders"
                    FOR EACH ROW EXECUTE FUNCTION procurement.test_reject_purchase_order();
                """);
        }

        try
        {
            await using var context = Db.NewContext();
            var act = () => Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId);
            (await act.Should().ThrowAsync<DbUpdateException>())
                .Which.InnerException.Should().BeOfType<PostgresException>().Which.SqlState.Should().Be(PostgresErrorCodes.RaiseException);
        }
        finally
        {
            await using var context = Db.NewContext();
            await context.Database.ExecuteSqlRawAsync("""
                DROP TRIGGER test_reject_purchase_order ON procurement."PurchaseOrders";
                DROP FUNCTION procurement.test_reject_purchase_order();
                """);
        }

        var after = await Snapshot(proposalId, budgetId);
        after.Status.Should().Be(ProposalStatus.Approved, "the status change rolled back with the failed insert");
        after.Spent.Should().Be(1_000m, "the budget update rolled back with the failed insert");
        after.Orders.Should().Be(0);
    }
}

/// <summary>Order numbering puts out-of-sequence numbers in the database, so it gets its own database.</summary>
public class OrderNumberingIntegrationTests(PostgresProcurementFixture db)
    : ProcurementIntegrationTestBase(db), IClassFixture<PostgresProcurementFixture>
{
    [PostgresFact]
    public async Task Conversion_StillSucceeds_AfterAGapInOrderNumbers()
    {
        var (branchId, budgetId) = await NewBranchWithBudget(10_000m);
        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 100m));
        await using (var context = Db.NewContext())
        {
            var prefix = $"PO-{DateTimeOffset.UtcNow.Year}-";
            var count = await context.PurchaseOrders.CountAsync(o => o.OrderNumber.StartsWith(prefix));
            var blocker = await NewProposal(branchId, ProposalStatus.Converted, (SeedIds.ProductInk, 1, 1m));
            var now = DateTimeOffset.UtcNow;
            context.PurchaseOrders.Add(new PurchaseOrder
            {
                Id = Guid.NewGuid(), ProposalId = blocker, SupplierId = SeedIds.Supplier,
                OrderNumber = $"{prefix}{count + 2:D6}", Status = PurchaseOrderStatus.Ordered, TotalCost = 1m,
                CreatedAt = now, UpdatedAt = now
            });
            await context.SaveChangesAsync();
        }

        // Numbering used to be COUNT + 1: the first conversion got count+1, the second count+2, which was taken.
        await using (var context = Db.NewContext())
        {
            await Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId);
        }

        var second = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 100m));
        await using (var context = Db.NewContext())
        {
            var act = () => Db.OrderService(context, ManagerId).ConvertProposalAsync(second);
            await act.Should().NotThrowAsync();
        }

        (await Snapshot(second, budgetId)).Orders.Should().Be(1);
        await using var verify = Db.NewContext();
        (await verify.PurchaseOrders.AsNoTracking().SingleAsync(o => o.ProposalId == second)).OrderNumber
            .Should().Be($"PO-{DateTimeOffset.UtcNow.Year}-{await HighestNumberBefore(second, verify) + 1:D6}");
    }

    [PostgresFact]
    public async Task OrderNumber_IsOnePastTheHighestThisYear_IgnoringOtherFormats()
    {
        var (branchId, _) = await NewBranchWithBudget(10_000m);
        var year = DateTimeOffset.UtcNow.Year;
        await using (var context = Db.NewContext())
        {
            foreach (var number in new[] { $"PO-{year}-000900", $"PO-{year - 1}-005000", "LEGACY-7" })
            {
                var owner = await NewProposal(branchId, ProposalStatus.Converted, (SeedIds.ProductInk, 1, 1m));
                var now = DateTimeOffset.UtcNow;
                context.PurchaseOrders.Add(new PurchaseOrder
                {
                    Id = Guid.NewGuid(), ProposalId = owner, SupplierId = SeedIds.Supplier, OrderNumber = number,
                    Status = PurchaseOrderStatus.Ordered, TotalCost = 1m, CreatedAt = now, UpdatedAt = now
                });
            }

            await context.SaveChangesAsync();
        }

        var proposalId = await NewProposal(branchId, ProposalStatus.Approved, (SeedIds.ProductPaper, 1, 10m));
        await using (var context = Db.NewContext())
        {
            (await Db.OrderService(context, ManagerId).ConvertProposalAsync(proposalId)).OrderNumber.Should().Be($"PO-{year}-000901");
        }
    }

    private static async Task<int> HighestNumberBefore(Guid excludedProposal, ProcurementDbContext context)
    {
        var prefix = $"PO-{DateTimeOffset.UtcNow.Year}-";
        var numbers = await context.PurchaseOrders.AsNoTracking()
            .Where(o => o.ProposalId != excludedProposal && o.OrderNumber.StartsWith(prefix))
            .Select(o => o.OrderNumber)
            .ToListAsync();
        return numbers.Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0).Max();
    }
}
