using StockPilot.Procurement.Application.Dtos.Budgets;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Tests.TestHelpers;

public class InMemoryUnitOfWork : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);

    public void Add<TEntity>(TEntity entity) where TEntity : class
    {
        // No-op: the in-memory test repositories already track entities via their parent's
        // navigation collection, with no real change tracker to reconcile.
    }

    public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default) =>
        operation(cancellationToken);
}

public class InMemoryProposalRepository : IProposalRepository
{
    public List<ProcurementProposal> Proposals { get; } = [];

    public Task<ProcurementProposal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));

    public Task<(IReadOnlyList<ProcurementProposal> Items, int TotalCount)> QueryAsync(ProposalListQuery query, CancellationToken cancellationToken = default)
    {
        var filtered = Proposals.AsEnumerable();
        if (query.Status is { } status) filtered = filtered.Where(p => p.Status == status);
        if (query.SupplierId is { } supplierId) filtered = filtered.Where(p => p.SupplierId == supplierId);
        if (query.BranchId is { } branchId) filtered = filtered.Where(p => p.BranchId == branchId);

        var list = filtered.OrderByDescending(p => p.CreatedAt).ToList();
        return Task.FromResult<(IReadOnlyList<ProcurementProposal>, int)>((list, list.Count));
    }

    public Task AddAsync(ProcurementProposal proposal, CancellationToken cancellationToken = default)
    {
        Proposals.Add(proposal);
        return Task.CompletedTask;
    }

    /// <summary>Orders consulted for Converted proposals; set it to share a purchase order repository's list.</summary>
    public List<PurchaseOrder> Orders { get; set; } = [];

    public Task<Guid?> FindOpenProposalForProductAsync(Guid branchId, Guid productId, CancellationToken cancellationToken = default)
    {
        var match = Proposals
            .Where(p => p.BranchId == branchId && p.LineItems.Any(li => li.ProductId == productId))
            .Where(p => p.Status is ProposalStatus.Draft or ProposalStatus.PendingApproval or ProposalStatus.RevisionRequested or ProposalStatus.Approved
                || (p.Status == ProposalStatus.Converted && Orders.Any(o =>
                    o.ProposalId == p.Id && o.Status is PurchaseOrderStatus.Ordered or PurchaseOrderStatus.PartiallyReceived)))
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => (Guid?)p.Id)
            .FirstOrDefault();
        return Task.FromResult(match);
    }
}

public class InMemoryPurchaseOrderRepository : IPurchaseOrderRepository
{
    public List<PurchaseOrder> Orders { get; } = [];

    public Task<PurchaseOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Orders.FirstOrDefault(o => o.Id == id));

    public Task<(IReadOnlyList<PurchaseOrder> Items, int TotalCount)> QueryAsync(OrderListQuery query, CancellationToken cancellationToken = default)
    {
        var filtered = Orders.AsEnumerable();
        if (query.Status is { } status) filtered = filtered.Where(o => o.Status == status);
        var list = filtered.OrderByDescending(o => o.CreatedAt).ToList();
        return Task.FromResult<(IReadOnlyList<PurchaseOrder>, int)>((list, list.Count));
    }

    public Task AddAsync(PurchaseOrder order, CancellationToken cancellationToken = default)
    {
        Orders.Add(order);
        return Task.CompletedTask;
    }

    public Task<string> GenerateOrderNumberAsync(int year, CancellationToken cancellationToken = default) =>
        Task.FromResult($"PO-{year}-{(Orders.Count + 1):D6}");
}

public class InMemoryBudgetRepository : IBudgetRepository
{
    public List<Budget> Budgets { get; } = [];

    public Task<Budget?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(Budgets.FirstOrDefault(b => b.Id == id));

    public Task<IReadOnlyList<Budget>> GetByBranchAsync(Guid? branchId, CancellationToken cancellationToken = default)
    {
        var filtered = branchId is { } id ? Budgets.Where(b => b.BranchId == id) : Budgets.AsEnumerable();
        return Task.FromResult<IReadOnlyList<Budget>>(filtered.ToList());
    }

    public Task<Budget?> FindActiveBudgetAsync(Guid branchId, DateOnly date, CancellationToken cancellationToken = default) =>
        Task.FromResult(Budgets.FirstOrDefault(b => b.BranchId == branchId && b.PeriodStart <= date && date <= b.PeriodEnd));

    public Task AddAsync(Budget budget, CancellationToken cancellationToken = default)
    {
        Budgets.Add(budget);
        return Task.CompletedTask;
    }
}
