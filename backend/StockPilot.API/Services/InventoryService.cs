using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Inventory;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class InventoryService(AppDbContext db) : IInventoryService
{
    public async Task<List<InventoryDto>> GetAllAsync() =>
        await BuildQuery().ToListAsync();

    public async Task<List<InventoryDto>> GetByBranchAsync(Guid branchId) =>
        await BuildQuery().Where(i => i.BranchId == branchId).ToListAsync();

    public async Task<InventoryDto> GetByBranchAndProductAsync(Guid branchId, Guid productId)
    {
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

    // AI tool endpoints
    public async Task<InventoryDto?> GetProductStockAsync(Guid productId, Guid branchId) =>
        await BuildQuery().FirstOrDefaultAsync(i => i.ProductId == productId && i.BranchId == branchId);

    public async Task<List<InventoryDto>> GetBranchInventoryAsync(Guid branchId) =>
        await GetByBranchAsync(branchId);

    public async Task<List<InventoryDto>> GetLowStockProductsAsync(Guid branchId) =>
        await GetLowStockAsync(branchId);

    private IQueryable<InventoryDto> BuildQuery() =>
        db.Inventories
            .Include(i => i.Product)
            .Include(i => i.Branch)
            .Select(i => new InventoryDto
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
                UpdatedAt = i.UpdatedAt
            });
}
