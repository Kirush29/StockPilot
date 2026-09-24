using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public interface IQuotationService
{
    Task<Quotation?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Quotation>> GetAllAsync();
    Task<Quotation> CreateAsync(Quotation quotation);
    Task<bool> UpdateStatusAsync(Guid id, string status);
    Task<IReadOnlyList<Quotation>> GetByProductIdAsync(Guid productId);
    Task<IReadOnlyList<Quotation>> GetBySupplierIdAsync(Guid supplierId);
}
