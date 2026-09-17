using StockPilot.API.DTOs.StockMovement;

namespace StockPilot.API.Interfaces;

public interface IStockMovementService
{
    Task<List<StockMovementDto>> GetAllAsync();
    Task<StockMovementDto> GetByIdAsync(Guid id);
    Task<List<StockMovementDto>> GetByProductAsync(Guid productId);
    Task<List<StockMovementDto>> GetByBranchAsync(Guid branchId);
    Task<StockMovementDto> CreateAdjustmentAsync(CreateAdjustmentDto dto, Guid performedBy);
    // AI tool endpoint
    Task<List<StockMovementDto>> GetStockMovementsAsync(Guid productId, Guid branchId);
}
