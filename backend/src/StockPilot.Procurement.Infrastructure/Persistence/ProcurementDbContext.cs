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
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProcurementDbContext).Assembly);
        ProcurementDataSeeder.Seed(modelBuilder);
    }
}
