using StockPilot.API.DTOs.Inventory;

namespace StockPilot.API.Interfaces;

public interface IInventoryService
{
    Task<List<InventoryDto>> GetAllAsync();
    Task<List<InventoryDto>> GetByBranchAsync(Guid branchId);
    Task<InventoryDto> GetByBranchAndProductAsync(Guid branchId, Guid productId);
    Task<List<InventoryDto>> GetLowStockAsync(Guid? branchId = null);
    Task<List<InventoryDto>> SearchAsync(string term);
    // AI tool endpoints
    Task<InventoryDto?> GetProductStockAsync(Guid productId, Guid branchId);
    Task<List<InventoryDto>> GetBranchInventoryAsync(Guid branchId);
    Task<List<InventoryDto>> GetLowStockProductsAsync(Guid branchId);
}
