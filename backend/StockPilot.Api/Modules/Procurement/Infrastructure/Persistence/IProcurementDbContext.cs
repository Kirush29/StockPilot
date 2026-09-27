using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using StockPilot.Procurement.Domain.Entities;

namespace StockPilot.Procurement.Infrastructure.Persistence;

/// <summary>
/// The Procurement module's view of the shared AppDbContext (D2). Same members the
/// repositories used on the former ProcurementDbContext, so no repository logic changes.
/// </summary>
public interface IProcurementDbContext
{
    /// <summary>PostgreSQL system column used as the optimistic-concurrency row version on proposals and budgets.</summary>
    public const string RowVersionColumn = "xmin";

    DbSet<Budget> Budgets { get; }

    DbSet<ProcurementProposal> Proposals { get; }

    DbSet<ProposalLineItem> ProposalLineItems { get; }

    DbSet<ApprovalDecision> ApprovalDecisions { get; }

    DbSet<PurchaseOrder> PurchaseOrders { get; }

    DbSet<PurchaseOrderLineItem> PurchaseOrderLineItems { get; }

    DbSet<PurchaseOrderStatusHistory> PurchaseOrderStatusHistory { get; }

    DatabaseFacade Database { get; }

    EntityEntry<TEntity> Add<TEntity>(TEntity entity) where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
