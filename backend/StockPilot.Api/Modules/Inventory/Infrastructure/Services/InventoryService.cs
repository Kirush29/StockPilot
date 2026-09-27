using Microsoft.EntityFrameworkCore;
using StockPilot.Infrastructure.Data;
using StockPilot.Application.DTOs.Inventory;
using StockPilot.Domain.Entities;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Exceptions;

namespace StockPilot.Infrastructure.Services;

public class InventoryService(StockPilotDbContext db, ICurrentUserService currentUserService) : IInventoryService
{
    public async Task<List<InventoryDto>> GetAllAsync() =>
        await BuildQuery().ToListAsync();

    public async Task<List<InventoryDto>> GetByBranchAsync(Guid branchId)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != branchId)
                throw new ForbiddenException("You can only view inventory for your assigned branch.");
        }

        return await BuildQuery().Where(i => i.BranchId == branchId).ToListAsync();
    }

    public async Task<InventoryDto> GetByBranchAndProductAsync(Guid branchId, Guid productId)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != branchId)
                throw new ForbiddenException("You can only view inventory for your assigned branch.");
        }

        var inv = await BuildQuery()
            .FirstOrDefaultAsync(i => i.BranchId == branchId && i.ProductId == productId)
            ?? throw new KeyNotFoundException($"No inventory record for product {productId} at branch {branchId}.");
        return inv;
    }

    public async Task<List<InventoryDto>> GetLowStockAsync(Guid? branchId = null) =>
        await BuildQuery()
            .Where(i => (branchId == null || i.BranchId == branchId) && i.IsLowStock)
            .ToListAsync();

    public async Task<List<InventoryDto>> SearchAsync(string term) =>
        await BuildQuery()
            .Where(i => i.ProductName.Contains(term) || i.SKU.Contains(term))
            .ToListAsync();

    public async Task<InventoryDto?> GetProductStockAsync(Guid productId, Guid branchId)
    {
        var role = currentUserService.Role;
        var userBranchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee")
        {
            if (!userBranchId.HasValue || userBranchId.Value != branchId)
                throw new ForbiddenException("You can only view stock for your assigned branch.");
        }

        return await BuildQuery().FirstOrDefaultAsync(i => i.ProductId == productId && i.BranchId == branchId);
    }

    public async Task<List<InventoryDto>> GetBranchInventoryAsync(Guid branchId) =>
        await GetByBranchAsync(branchId);

    public async Task<List<InventoryDto>> GetLowStockProductsAsync(Guid branchId) =>
        await GetLowStockAsync(branchId);

    private IQueryable<InventoryDto> BuildQuery()
    {
        var query = db.Inventories
            .Include(i => i.Product)
            .Include(i => i.Branch)
            .AsQueryable();

        var role = currentUserService.Role;
        var branchId = currentUserService.BranchId;

        if (role is "BranchManager" or "StoreEmployee" && branchId.HasValue)
        {
            query = query.Where(i => i.BranchId == branchId.Value);
        }

        return query.Select(i => new InventoryDto
        {
            InventoryId = i.InventoryId,
            ProductId = i.ProductId,
            ProductName = i.Product.Name,
            SKU = i.Product.SKU,
            BranchId = i.BranchId,
            BranchName = i.Branch.Name,
            QuantityOnHand = i.QuantityOnHand,
            ReservedQuantity = i.ReservedQuantity,
            AvailableQuantity = i.QuantityOnHand - i.ReservedQuantity,
            ReorderLevel = i.Product.ReorderLevel,
            MinimumStockLevel = i.Product.MinimumStockLevel,
            IsLowStock = i.QuantityOnHand <= i.Product.ReorderLevel,
            UpdatedAt = i.LastUpdatedAt
        });
    }
}
