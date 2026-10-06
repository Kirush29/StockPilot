using StockPilot.Domain.Entities;

namespace StockPilot.Application.Interfaces;

public interface IQuotationRepository
{
    Task<Quotation?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Quotation>> GetAllAsync();
    Task AddAsync(Quotation quotation);
    Task UpdateAsync(Quotation quotation);
    Task<IReadOnlyList<Quotation>> GetByProductIdAsync(Guid productId);
    Task<IReadOnlyList<Quotation>> GetBySupplierIdAsync(Guid supplierId);
    Task<int> GetNextReferenceSequenceAsync();
}
