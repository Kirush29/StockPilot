using StockPilot.Application.DTOs.Batch;

namespace StockPilot.Application.Interfaces;

public interface IBatchService
{
    Task<List<BatchDto>> GetAllAsync();
    Task<BatchDto> GetByIdAsync(Guid id);
    Task<List<BatchDto>> GetExpiringAsync(int days = 30);
    Task<List<BatchDto>> GetExpiredAsync();
    Task<List<BatchDto>> GetExpiringBatchesAsync(Guid branchId, int days);
    Task<BatchDto> CreateAsync(CreateBatchDto dto, Guid performedBy);
    Task<BatchDto> UpdateAsync(Guid id, UpdateBatchDto dto);
}
