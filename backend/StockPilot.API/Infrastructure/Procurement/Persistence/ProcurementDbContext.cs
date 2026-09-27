using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;

namespace StockPilot.Procurement.Infrastructure.Persistence;

public class ProcurementDbContext(DbContextOptions<ProcurementDbContext> options) : DbContext(options)
{
    public DbSet<Budget> Budgets => Set<Budget>();

    public DbSet<ProcurementProposal> Proposals => Set<ProcurementProposal>();

    public DbSet<ProposalLineItem> ProposalLineItems => Set<ProposalLineItem>();

    public DbSet<ApprovalDecision> ApprovalDecisions => Set<ApprovalDecision>();

    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();

    public DbSet<PurchaseOrderLineItem> PurchaseOrderLineItems => Set<PurchaseOrderLineItem>();

    public DbSet<PurchaseOrderStatusHistory> PurchaseOrderStatusHistory => Set<PurchaseOrderStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("procurement");
        // Scoped to this module's own namespace so other modules' configurations (same assembly
        // since the merge into StockPilot.API) aren't picked up into this unrelated DbContext's model.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProcurementDbContext).Assembly,
            type => type.Namespace is not null && type.Namespace.StartsWith("StockPilot.Procurement", StringComparison.Ordinal));
        ProcurementDataSeeder.Seed(modelBuilder);

        // Optimistic concurrency on the rows that concurrent requests race to change: a proposal's
        // status (approve, convert) and a budget's SpentAmount (convert, cancel). PostgreSQL's xmin
        // system column changes on every update, so EF adds "WHERE xmin = <value read>" and a writer
        // working from a stale read updates 0 rows and fails instead of double-converting or losing
        // a budget update. xmin is a system column: the migration adds nothing to the tables.
        // Skipped for the in-memory provider (local dev without Postgres), which has no xmin.
        if (Database.IsNpgsql())
        {
            modelBuilder.Entity<ProcurementProposal>().Property<uint>(RowVersionColumn).HasColumnType("xid").IsRowVersion();
            modelBuilder.Entity<Budget>().Property<uint>(RowVersionColumn).HasColumnType("xid").IsRowVersion();
        }
    }

    public const string RowVersionColumn = "xmin";
}
