using Microsoft.EntityFrameworkCore;
using StockPilot.Infrastructure.Data;
using StockPilot.Application.DTOs.StockMovement;
using StockPilot.Domain.Entities;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Enums;
using StockPilot.Domain.Exceptions;

namespace StockPilot.Infrastructure.Services;

public class StockMovementService(StockPilotDbContext db, ICurrentUserService currentUserService) : IStockMovementService
{
    private static readonly HashSet<MovementType> AllowedAdjustmentTypes =
    [
        MovementType.Adjustment,
        MovementType.WriteOff,
        MovementType.TransferIn
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

    public async Task<List<StockMovementDto>> GetByBranchAsync(Guid branchId)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != branchId)
                throw new ForbiddenException("You can only view stock movements for your assigned branch.");
        }

        return await BuildQuery()
            .Where(m => m.BranchId == branchId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<StockMovementDto>> GetStockMovementsAsync(Guid productId, Guid branchId)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != branchId)
                throw new ForbiddenException("You can only view stock movements for your assigned branch.");
        }

        return await BuildQuery()
            .Where(m => m.ProductId == productId && m.BranchId == branchId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<StockMovementDto> CreateAdjustmentAsync(CreateAdjustmentDto dto, Guid performedBy)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != dto.BranchId)
                throw new ForbiddenException("You can only create stock adjustments for your assigned branch.");
        }

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

        if (dto.BatchId.HasValue)
        {
            var batch = await db.Batches.FindAsync(dto.BatchId.Value)
                ?? throw new KeyNotFoundException($"Batch {dto.BatchId} not found.");

            if (batch.ProductId != dto.ProductId)
                throw new ArgumentException("Batch does not belong to the specified product.");

            if (batch.Status == BatchStatus.Expired &&
                dto.MovementType != MovementType.WriteOff)
                throw new InvalidOperationException("Expired batches cannot be used for normal stock operations.");
        }

        await using var tx = await db.Database.BeginTransactionAsync();

        var inventory = await db.Inventories
            .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.BranchId == dto.BranchId);

        decimal previousQty = inventory?.QuantityOnHand ?? 0;
        decimal newQty;

        bool isDecrease = dto.MovementType is MovementType.Adjustment or MovementType.WriteOff;

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
                LastUpdatedAt = DateTime.UtcNow
            };
            db.Inventories.Add(inventory);
        }
        else
        {
            inventory.QuantityOnHand = newQty;
            inventory.LastUpdatedAt = DateTime.UtcNow;
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

    private IQueryable<StockMovementDto> BuildQuery()
    {
        var query = db.StockMovements
            .Include(m => m.Product)
            .Include(m => m.Batch)
            .Include(m => m.Branch)
            .Include(m => m.PerformedByUser)
            .AsQueryable();

        var role = currentUserService.Role;
        var branchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee" && branchId.HasValue)
        {
            query = query.Where(m => m.BranchId == branchId.Value);
        }

        return query.Select(m => new StockMovementDto
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
}
