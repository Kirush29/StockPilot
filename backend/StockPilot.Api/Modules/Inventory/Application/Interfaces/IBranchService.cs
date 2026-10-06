using StockPilot.Application.DTOs.Branch;

namespace StockPilot.Application.Interfaces;

public interface IBranchService
{
    Task<List<BranchDto>> GetAllAsync(bool includeInactive = false);
    Task<BranchDto> GetByIdAsync(Guid id);
    Task<BranchDto> CreateAsync(CreateBranchDto dto);
    Task<BranchDto> UpdateAsync(Guid id, UpdateBranchDto dto);
    Task DeactivateAsync(Guid id);
    Task<BranchDto> ToggleStatusAsync(Guid id, bool isActive);
}
