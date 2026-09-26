using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.StockMovement;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class StockMovementService(AppDbContext db) : IStockMovementService
{
    // Adjustment-only movement types permitted via the API
    private static readonly HashSet<MovementType> AllowedAdjustmentTypes =
    [
        MovementType.AdjustmentIncrease,
        MovementType.AdjustmentDecrease,
        MovementType.Damage,
        MovementType.Return
    ];

    public async Task<List<StockMovementDto>> GetAllAsync() =>
        await BuildQuery().OrderByDescending(m => m.CreatedAt).ToListAsync();

    public async Task<StockMovementDto> GetByIdAsync(Guid id)
    {
        var movement = await BuildQuery().FirstOrDefaultAsync(m => m.StockMovementId == id)
            ?? throw new KeyNotFoundException($"Stock movement {id} not found.");
        return movement;
    }

    public async Task<List<StockMovementDto>> GetByProductAsync(Guid productId) =>
        await BuildQuery()
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

    public async Task<List<StockMovementDto>> GetByBranchAsync(Guid branchId) =>
        await BuildQuery()
            .Where(m => m.BranchId == branchId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

    public async Task<List<StockMovementDto>> GetStockMovementsAsync(Guid productId, Guid branchId) =>
        await BuildQuery()
            .Where(m => m.ProductId == productId && m.BranchId == branchId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

    public async Task<StockMovementDto> CreateAdjustmentAsync(CreateAdjustmentDto dto, Guid performedBy)
    {
        if (!AllowedAdjustmentTypes.Contains(dto.MovementType))
            throw new ArgumentException($"Movement type '{dto.MovementType}' is not permitted via manual adjustment.");

        if (dto.Quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero.");

        var product = await db.Products.FindAsync(dto.ProductId)
            ?? throw new KeyNotFoundException($"Product {dto.ProductId} not found.");

        if (!product.IsActive)
            throw new InvalidOperationException("Cannot adjust stock for an inactive product.");

        if (!await db.Branches.AnyAsync(b => b.BranchId == dto.BranchId && b.IsActive))
            throw new KeyNotFoundException($"Branch {dto.BranchId} not found or inactive.");

        // Validate batch if provided
        if (dto.BatchId.HasValue)
        {
            var batch = await db.Batches.FindAsync(dto.BatchId.Value)
                ?? throw new KeyNotFoundException($"Batch {dto.BatchId} not found.");

            if (batch.ProductId != dto.ProductId)
                throw new ArgumentException("Batch does not belong to the specified product.");

            if (batch.Status == BatchStatus.Expired &&
                dto.MovementType != MovementType.Damage)
                throw new InvalidOperationException("Expired batches cannot be used for normal stock operations.");
        }

        await using var tx = await db.Database.BeginTransactionAsync();

        var inventory = await db.Inventories
            .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.BranchId == dto.BranchId);

        decimal previousQty = inventory?.QuantityOnHand ?? 0;
        decimal newQty;

        bool isDecrease = dto.MovementType is MovementType.AdjustmentDecrease or MovementType.Damage;

        if (isDecrease)
        {
            if (inventory == null || inventory.QuantityOnHand < dto.Quantity)
                throw new InvalidOperationException(
                    $"Insufficient stock. Available: {inventory?.QuantityOnHand ?? 0}, Requested: {dto.Quantity}.");
            newQty = inventory.QuantityOnHand - dto.Quantity;
        }
        else
        {
            newQty = previousQty + dto.Quantity;
        }

        if (inventory == null)
        {
            inventory = new Inventory
            {
                InventoryId = Guid.NewGuid(),
                ProductId = dto.ProductId,
                BranchId = dto.BranchId,
                QuantityOnHand = newQty,
                ReservedQuantity = 0,
                UpdatedAt = DateTime.UtcNow
            };
            db.Inventories.Add(inventory);
        }
        else
        {
            inventory.QuantityOnHand = newQty;
            inventory.UpdatedAt = DateTime.UtcNow;
        }

        var movement = new StockMovement
        {
            StockMovementId = Guid.NewGuid(),
            ProductId = dto.ProductId,
            BatchId = dto.BatchId,
            BranchId = dto.BranchId,
            MovementType = dto.MovementType,
            Quantity = dto.Quantity,
            ReferenceType = "ManualAdjustment",
            PreviousQuantity = previousQty,
            NewQuantity = newQty,
            Reason = dto.Reason,
            PerformedBy = performedBy,
            CreatedAt = DateTime.UtcNow
        };
        db.StockMovements.Add(movement);

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetByIdAsync(movement.StockMovementId);
    }

    private IQueryable<StockMovementDto> BuildQuery() =>
        db.StockMovements
            .Include(m => m.Product)
            .Include(m => m.Batch)
            .Include(m => m.Branch)
            .Include(m => m.PerformedByUser)
            .Select(m => new StockMovementDto
            {
                StockMovementId = m.StockMovementId,
                ProductId = m.ProductId,
                ProductName = m.Product.Name,
                SKU = m.Product.SKU,
                BatchId = m.BatchId,
                BatchNumber = m.Batch != null ? m.Batch.BatchNumber : null,
                BranchId = m.BranchId,
                BranchName = m.Branch.Name,
                MovementType = m.MovementType.ToString(),
                Quantity = m.Quantity,
                ReferenceType = m.ReferenceType,
                ReferenceId = m.ReferenceId,
                PreviousQuantity = m.PreviousQuantity,
                NewQuantity = m.NewQuantity,
                Reason = m.Reason,
                PerformedBy = m.PerformedBy,
                PerformedByName = m.PerformedByUser.FullName,
                CreatedAt = m.CreatedAt
            });
}
