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
    }
}
