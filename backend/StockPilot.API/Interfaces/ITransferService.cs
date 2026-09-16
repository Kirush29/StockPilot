using StockPilot.API.DTOs.Transfer;

namespace StockPilot.API.Interfaces;

public interface ITransferService
{
    Task<List<TransferDto>> GetAllAsync();
    Task<TransferDto> GetByIdAsync(Guid id);
    Task<TransferDto> CreateAsync(CreateTransferDto dto, Guid requestedBy);
    Task<TransferDto> ApproveAsync(Guid id, ApproveTransferDto dto, Guid approvedBy);
    Task<TransferDto> RejectAsync(Guid id, RejectTransferDto dto, Guid rejectedBy);
    Task<TransferDto> ShipAsync(Guid id, Guid shippedBy);
    Task<TransferDto> ReceiveAsync(Guid id, ReceiveTransferDto dto, Guid receivedBy);
    Task<TransferDto> CancelAsync(Guid id, Guid cancelledBy);
    // AI tool endpoints
    Task<List<TransferDto>> GetTransferHistoryAsync(Guid productId, Guid branchId);
}
