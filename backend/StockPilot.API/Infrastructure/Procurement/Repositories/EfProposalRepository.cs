using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfProposalRepository(ProcurementDbContext context) : IProposalRepository
{
    public Task<ProcurementProposal?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Proposals
            .Include(p => p.LineItems)
            .Include(p => p.ApprovalDecisions)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<(IReadOnlyList<ProcurementProposal> Items, int TotalCount)> QueryAsync(
        ProposalListQuery query, CancellationToken cancellationToken = default)
    {
        var filtered = context.Proposals.AsNoTracking().AsQueryable();

        if (query.Status is { } status)
        {
            filtered = filtered.Where(p => p.Status == status);
        }

        if (query.SupplierId is { } supplierId)
        {
            filtered = filtered.Where(p => p.SupplierId == supplierId);
        }

        if (query.BranchId is { } branchId)
        {
            filtered = filtered.Where(p => p.BranchId == branchId);
        }

        var totalCount = await filtered.CountAsync(cancellationToken);

        var (field, descending) = ParseSort(query.Sort);
        filtered = (field, descending) switch
        {
            ("totalestimatedcost", true) => filtered.OrderByDescending(p => p.TotalEstimatedCost),
            ("totalestimatedcost", false) => filtered.OrderBy(p => p.TotalEstimatedCost),
            ("status", true) => filtered.OrderByDescending(p => p.Status),
            ("status", false) => filtered.OrderBy(p => p.Status),
            ("updatedat", true) => filtered.OrderByDescending(p => p.UpdatedAt),
            ("updatedat", false) => filtered.OrderBy(p => p.UpdatedAt),
            (_, true) => filtered.OrderByDescending(p => p.CreatedAt),
            (_, false) => filtered.OrderBy(p => p.CreatedAt)
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);

        var items = await filtered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task AddAsync(ProcurementProposal proposal, CancellationToken cancellationToken = default) =>
        await context.Proposals.AddAsync(proposal, cancellationToken);

    private static (string Field, bool Descending) ParseSort(string sort)
    {
        if (string.IsNullOrWhiteSpace(sort))
        {
            return ("createdat", true);
        }

        var descending = sort.StartsWith('-');
        var field = (descending ? sort[1..] : sort).Trim().ToLowerInvariant();
        return (field, descending);
    }
}
