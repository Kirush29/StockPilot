using Microsoft.EntityFrameworkCore;
using StockPilot.API.Entities;

namespace StockPilot.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ── User (stub) ──────────────────────────────────────────────────────
        mb.Entity<User>(e =>
        {
            e.HasKey(u => u.UserId);
            e.Property(u => u.FullName).IsRequired().HasMaxLength(200);
            e.Property(u => u.Email).IsRequired().HasMaxLength(200);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).IsRequired().HasMaxLength(50);
        });

        // ── Branch ───────────────────────────────────────────────────────────
        mb.Entity<Branch>(e =>
        {
            e.HasKey(b => b.BranchId);
            e.Property(b => b.BranchCode).IsRequired().HasMaxLength(20);
            e.HasIndex(b => b.BranchCode).IsUnique();
            e.Property(b => b.Name).IsRequired().HasMaxLength(200);
            e.Property(b => b.Address).HasMaxLength(500);
        });

        // ── Category ─────────────────────────────────────────────────────────
        mb.Entity<Category>(e =>
        {
            e.HasKey(c => c.CategoryId);
            e.Property(c => c.Name).IsRequired().HasMaxLength(200);
            e.HasIndex(c => c.Name).IsUnique();
        });

        // ── Product ──────────────────────────────────────────────────────────
        mb.Entity<Product>(e =>
        {
            e.HasKey(p => p.ProductId);
            e.Property(p => p.SKU).IsRequired().HasMaxLength(100);
            e.HasIndex(p => p.SKU).IsUnique();
            e.Property(p => p.Barcode).HasMaxLength(100);
            e.HasIndex(p => p.Barcode).IsUnique().HasFilter("\"Barcode\" IS NOT NULL");
            e.Property(p => p.Name).IsRequired().HasMaxLength(300);
            e.Property(p => p.Unit).IsRequired().HasMaxLength(50);
            e.Property(p => p.CostPrice).HasPrecision(18, 4);
            e.Property(p => p.SellingPrice).HasPrecision(18, 4);
            e.Property(p => p.MinimumStockLevel).HasPrecision(18, 4);
            e.Property(p => p.ReorderLevel).HasPrecision(18, 4);
            e.Property(p => p.MaximumStockLevel).HasPrecision(18, 4);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Product_CostPrice", "\"CostPrice\" >= 0");
                t.HasCheckConstraint("CK_Product_SellingPrice", "\"SellingPrice\" >= 0");
                t.HasCheckConstraint("CK_Product_StockLevels", "\"MinimumStockLevel\" >= 0 AND \"ReorderLevel\" >= 0 AND \"MaximumStockLevel\" >= 0");
            });

            e.HasOne(p => p.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(p => p.CategoryId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Inventory ────────────────────────────────────────────────────────
        mb.Entity<Inventory>(e =>
        {
            e.HasKey(i => i.InventoryId);
            e.HasIndex(i => new { i.ProductId, i.BranchId }).IsUnique();
            e.Property(i => i.QuantityOnHand).HasPrecision(18, 4);
            e.Property(i => i.ReservedQuantity).HasPrecision(18, 4);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Inventory_QuantityOnHand", "\"QuantityOnHand\" >= 0");
                t.HasCheckConstraint("CK_Inventory_ReservedQuantity", "\"ReservedQuantity\" >= 0");
            });
            // AvailableQuantity is computed in C#, not stored
            e.Ignore(i => i.AvailableQuantity);

            e.HasOne(i => i.Product)
             .WithMany(p => p.Inventories)
             .HasForeignKey(i => i.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Branch)
             .WithMany(b => b.Inventories)
             .HasForeignKey(i => i.BranchId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Batch ────────────────────────────────────────────────────────────
        mb.Entity<Batch>(e =>
        {
            e.HasKey(b => b.BatchId);
            e.Property(b => b.BatchNumber).IsRequired().HasMaxLength(100);
            e.HasIndex(b => new { b.BatchNumber, b.BranchId }).IsUnique();
            e.HasIndex(b => b.ExpiryDate);
            e.Property(b => b.Quantity).HasPrecision(18, 4);
            e.Property(b => b.UnitCost).HasPrecision(18, 4);
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Batch_Quantity", "\"Quantity\" >= 0");
                t.HasCheckConstraint("CK_Batch_UnitCost", "\"UnitCost\" >= 0");
            });
            e.Property(b => b.Status).HasConversion<string>();

            e.HasOne(b => b.Product)
             .WithMany(p => p.Batches)
             .HasForeignKey(b => b.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(b => b.Branch)
             .WithMany(br => br.Batches)
             .HasForeignKey(b => b.BranchId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StockMovement ────────────────────────────────────────────────────
        mb.Entity<StockMovement>(e =>
        {
            e.HasKey(sm => sm.StockMovementId);
            e.HasIndex(sm => sm.CreatedAt);
            e.HasIndex(sm => new { sm.ProductId, sm.BranchId });
            e.Property(sm => sm.Quantity).HasPrecision(18, 4);
            e.Property(sm => sm.PreviousQuantity).HasPrecision(18, 4);
            e.Property(sm => sm.NewQuantity).HasPrecision(18, 4);
            e.ToTable(t => t.HasCheckConstraint("CK_StockMovement_Quantity", "\"Quantity\" > 0"));
            e.Property(sm => sm.MovementType).HasConversion<string>();
            e.Property(sm => sm.ReferenceType).HasMaxLength(100);
            e.Property(sm => sm.ReferenceId).HasMaxLength(100);
            e.Property(sm => sm.Reason).HasMaxLength(500);

            e.HasOne(sm => sm.Product)
             .WithMany(p => p.StockMovements)
             .HasForeignKey(sm => sm.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(sm => sm.Batch)
             .WithMany(b => b.StockMovements)
             .HasForeignKey(sm => sm.BatchId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(sm => sm.Branch)
             .WithMany(b => b.StockMovements)
             .HasForeignKey(sm => sm.BranchId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(sm => sm.PerformedByUser)
             .WithMany(u => u.StockMovements)
             .HasForeignKey(sm => sm.PerformedBy)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StockTransfer ────────────────────────────────────────────────────
        mb.Entity<StockTransfer>(e =>
        {
            e.HasKey(st => st.StockTransferId);
            e.Property(st => st.TransferNumber).IsRequired().HasMaxLength(50);
            e.HasIndex(st => st.TransferNumber).IsUnique();
            e.HasIndex(st => st.Status);
            e.Property(st => st.Status).HasConversion<string>();
            e.Property(st => st.Notes).HasMaxLength(1000);
            e.Property(st => st.RejectionReason).HasMaxLength(500);

            e.HasOne(st => st.SourceBranch)
             .WithMany(b => b.OutboundTransfers)
             .HasForeignKey(st => st.SourceBranchId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(st => st.DestinationBranch)
             .WithMany(b => b.InboundTransfers)
             .HasForeignKey(st => st.DestinationBranchId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(st => st.RequestedByUser)
             .WithMany(u => u.RequestedTransfers)
             .HasForeignKey(st => st.RequestedBy)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(st => st.ApprovedByUser)
             .WithMany(u => u.ApprovedTransfers)
             .HasForeignKey(st => st.ApprovedBy)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── StockTransferItem ────────────────────────────────────────────────
        mb.Entity<StockTransferItem>(e =>
        {
            e.HasKey(i => i.StockTransferItemId);
            e.Property(i => i.RequestedQuantity).HasPrecision(18, 4);
            e.Property(i => i.ApprovedQuantity).HasPrecision(18, 4);
            e.Property(i => i.ShippedQuantity).HasPrecision(18, 4);
            e.Property(i => i.ReceivedQuantity).HasPrecision(18, 4);
            e.ToTable(t => t.HasCheckConstraint("CK_TransferItem_RequestedQty", "\"RequestedQuantity\" > 0"));

            e.HasOne(i => i.StockTransfer)
             .WithMany(st => st.Items)
             .HasForeignKey(i => i.StockTransferId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.Product)
             .WithMany(p => p.TransferItems)
             .HasForeignKey(i => i.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Batch)
             .WithMany(b => b.TransferItems)
             .HasForeignKey(i => i.BatchId)
             .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
