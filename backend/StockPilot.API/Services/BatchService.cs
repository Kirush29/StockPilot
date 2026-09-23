using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Batch;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class BatchService(AppDbContext db) : IBatchService
{
    private const int ExpiringSoonDays = 30;

    public async Task<List<BatchDto>> GetAllAsync() =>
        await BuildQuery().ToListAsync();

    public async Task<BatchDto> GetByIdAsync(Guid id)
    {
        var batch = await BuildQuery(b => b.BatchId == id).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Batch {id} not found.");
        return batch;
    }

    public async Task<List<BatchDto>> GetExpiringAsync(int days = ExpiringSoonDays)
    {
        var cutoff = DateTime.UtcNow.AddDays(days);
        return await BuildQuery(b => b.ExpiryDate != null && b.ExpiryDate <= cutoff && b.Status == BatchStatus.Active)
            .ToListAsync();
    }

    public async Task<List<BatchDto>> GetExpiredAsync() =>
        await BuildQuery(b => b.Status == BatchStatus.Expired).ToListAsync();

    public async Task<List<BatchDto>> GetExpiringBatchesAsync(Guid branchId, int days)
    {
        var cutoff = DateTime.UtcNow.AddDays(days);
        return await BuildQuery(b => b.BranchId == branchId && b.ExpiryDate != null
                && b.ExpiryDate <= cutoff && b.Status == BatchStatus.Active)
            .ToListAsync();
    }

    public async Task<BatchDto> CreateAsync(CreateBatchDto dto, Guid performedBy)
    {
        // Validate
        if (!await db.Products.AnyAsync(p => p.ProductId == dto.ProductId && p.IsActive))
            throw new ArgumentException("Product does not exist or is inactive.");

        if (!await db.Branches.AnyAsync(b => b.BranchId == dto.BranchId && b.IsActive))
            throw new ArgumentException("Branch does not exist or is inactive.");

        if (dto.Quantity < 0)
            throw new ArgumentException("Quantity cannot be negative.");

        if (dto.UnitCost < 0)
            throw new ArgumentException("Unit cost cannot be negative.");

        if (string.IsNullOrWhiteSpace(dto.BatchNumber))
            throw new ArgumentException("Batch number is required.");

        if (await db.Batches.AnyAsync(b => b.BatchNumber == dto.BatchNumber && b.BranchId == dto.BranchId))
            throw new InvalidOperationException($"Batch number '{dto.BatchNumber}' already exists at this branch.");

        if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value <= DateTime.UtcNow)
            throw new ArgumentException("Expiry date must be in the future for a new batch.");

        await using var tx = await db.Database.BeginTransactionAsync();

        var batch = new Batch
        {
            BatchId = Guid.NewGuid(),
            ProductId = dto.ProductId,
            BranchId = dto.BranchId,
            BatchNumber = dto.BatchNumber.Trim(),
            Quantity = dto.Quantity,
            UnitCost = dto.UnitCost,
            ManufacturingDate = dto.ManufacturingDate,
            ExpiryDate = dto.ExpiryDate,
            ReceivedDate = dto.ReceivedDate ?? DateTime.UtcNow,
            Status = BatchStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Batches.Add(batch);

        // Update or create inventory record
        var inventory = await db.Inventories
            .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.BranchId == dto.BranchId);

        decimal previousQty = 0;
        if (inventory == null)
        {
            inventory = new Inventory
            {
                InventoryId = Guid.NewGuid(),
                ProductId = dto.ProductId,
                BranchId = dto.BranchId,
                QuantityOnHand = dto.Quantity,
                ReservedQuantity = 0,
                UpdatedAt = DateTime.UtcNow
            };
            db.Inventories.Add(inventory);
        }
        else
        {
            previousQty = inventory.QuantityOnHand;
            inventory.QuantityOnHand += dto.Quantity;
            inventory.UpdatedAt = DateTime.UtcNow;
        }

        // Audit movement
        if (dto.Quantity > 0)
        {
            db.StockMovements.Add(new StockMovement
            {
                StockMovementId = Guid.NewGuid(),
                ProductId = dto.ProductId,
                BatchId = batch.BatchId,
                BranchId = dto.BranchId,
                MovementType = MovementType.Receive,
                Quantity = dto.Quantity,
                ReferenceType = "Batch",
                ReferenceId = batch.BatchId.ToString(),
                PreviousQuantity = previousQty,
                NewQuantity = previousQty + dto.Quantity,
                Reason = $"Batch {dto.BatchNumber} received",
                PerformedBy = performedBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetByIdAsync(batch.BatchId);
    }

    public async Task<BatchDto> UpdateAsync(Guid id, UpdateBatchDto dto)
    {
        var batch = await db.Batches.FindAsync(id)
            ?? throw new KeyNotFoundException($"Batch {id} not found.");

        if (dto.Quantity < 0) throw new ArgumentException("Quantity cannot be negative.");
        if (dto.UnitCost < 0) throw new ArgumentException("Unit cost cannot be negative.");

        batch.Quantity = dto.Quantity;
        batch.UnitCost = dto.UnitCost;
        batch.ManufacturingDate = dto.ManufacturingDate;
        batch.ExpiryDate = dto.ExpiryDate;
        batch.Status = dto.Status;
        batch.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    private IQueryable<BatchDto> BuildQuery(System.Linq.Expressions.Expression<Func<Batch, bool>>? predicate = null)
    {
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(ExpiringSoonDays);

        var query = db.Batches
            .Include(b => b.Product)
            .Include(b => b.Branch)
            .AsQueryable();

        if (predicate != null)
        {
            query = query.Where(predicate);
        }

        return query.Select(b => new BatchDto
            {
                BatchId = b.BatchId,
                ProductId = b.ProductId,
                ProductName = b.Product.Name,
                SKU = b.Product.SKU,
                BranchId = b.BranchId,
                BranchName = b.Branch.Name,
                BatchNumber = b.BatchNumber,
                Quantity = b.Quantity,
                UnitCost = b.UnitCost,
                ManufacturingDate = b.ManufacturingDate,
                ExpiryDate = b.ExpiryDate,
                ReceivedDate = b.ReceivedDate,
                Status = b.Status.ToString(),
                IsExpired = b.ExpiryDate != null && b.ExpiryDate < now,
                IsExpiringSoon = b.ExpiryDate != null && b.ExpiryDate >= now && b.ExpiryDate <= cutoff,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            });
    }
}
