using StockPilot.Procurement.Application.Dtos.Budgets;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Tests.TestHelpers;

public class InMemoryUnitOfWork : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(0);
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
