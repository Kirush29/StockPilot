using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Domain.Entities.Sales;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Infrastructure.Persistence;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Data;

/// <summary>
/// The one shared DbContext and migration history for all four modules (integration decision D2).
///
/// It adds no model rules of its own: it applies each module's existing entity configurations exactly as
/// that module's former DbContext did, so table names, casing, keys, precision, CHECK constraints and seed
/// data are unchanged. Modules keep depending on the type they used before, all served by this instance:
/// <list type="bullet">
/// <item>Inventory (S1) and Supplier (S3): <see cref="InventorySupplierDbContext"/> (base class).</item>
/// <item>Sales &amp; Demand (S2): <see cref="IApplicationDbContext"/>.</item>
/// <item>Procurement (S4): <see cref="IProcurementDbContext"/>, tables kept in the <c>procurement</c> schema.</item>
/// </list>
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options)
    : InventorySupplierDbContext(options), IApplicationDbContext, IProcurementDbContext
{
    public const string ProcurementSchema = "procurement";

    // ── Sales & Demand (S2) ──
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<DemandForecast> DemandForecasts => Set<DemandForecast>();
    public DbSet<DemandForecastItem> DemandForecastItems => Set<DemandForecastItem>();
    public DbSet<ProductDemandMetric> ProductDemandMetrics => Set<ProductDemandMetric>();
    public DbSet<AgentWorkflowAudit> AgentWorkflowAudits => Set<AgentWorkflowAudit>();

    // ── Procurement (S4) ──
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<ProcurementProposal> Proposals => Set<ProcurementProposal>();
    public DbSet<ProposalLineItem> ProposalLineItems => Set<ProposalLineItem>();
    public DbSet<ApprovalDecision> ApprovalDecisions => Set<ApprovalDecision>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLineItem> PurchaseOrderLineItems => Set<PurchaseOrderLineItem>();
    public DbSet<PurchaseOrderStatusHistory> PurchaseOrderStatusHistory => Set<PurchaseOrderStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Inventory (S1) + Supplier (S3): their context's own model (sequence + src/StockPilot.Infrastructure configurations).
        base.OnModelCreating(modelBuilder);

        // Sales & Demand (S2): same filter the former StockPilot.Infrastructure.Persistence.StockPilotDbContext used.
        var apiAssembly = typeof(AppDbContext).Assembly;
        modelBuilder.ApplyConfigurationsFromAssembly(apiAssembly,
            type => type.Namespace is not null && type.Namespace.StartsWith("StockPilot.Infrastructure.Persistence", StringComparison.Ordinal));

        // Procurement (S4): same filter, seed data and row versions as the former ProcurementDbContext.
        modelBuilder.ApplyConfigurationsFromAssembly(apiAssembly,
            type => type.Namespace is not null && type.Namespace.StartsWith("StockPilot.Procurement", StringComparison.Ordinal));
        ProcurementDataSeeder.Seed(modelBuilder);

        // ProcurementDbContext used HasDefaultSchema("procurement"). A default schema would move every
        // module's tables, so the schema is set on the Procurement entity types only (ADR-004 as amended).
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => t.ClrType.Namespace?.StartsWith("StockPilot.Procurement", StringComparison.Ordinal) == true))
        {
            entityType.SetSchema(ProcurementSchema);
        }

        // Optimistic concurrency on proposals and budgets via PostgreSQL's xmin (see ADR-004 / the former
        // ProcurementDbContext). Skipped for the in-memory provider, which has no xmin.
        if (Database.IsNpgsql())
        {
            modelBuilder.Entity<ProcurementProposal>().Property<uint>(IProcurementDbContext.RowVersionColumn).HasColumnType("xid").IsRowVersion();
            modelBuilder.Entity<Budget>().Property<uint>(IProcurementDbContext.RowVersionColumn).HasColumnType("xid").IsRowVersion();
        }
    }
}
