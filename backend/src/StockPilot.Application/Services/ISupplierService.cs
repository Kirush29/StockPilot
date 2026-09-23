using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public interface ISupplierService
{
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Supplier>> GetAllAsync();
    Task<Supplier> CreateAsync(Supplier supplier);
    Task<bool> UpdateAsync(Supplier supplier);
    Task<bool> DeactivateAsync(Guid id);
    Task<IReadOnlyList<Supplier>> SearchAsync(string keyword);
    Task<SupplierRating> AddRatingAsync(Guid supplierId, SupplierRating rating);
    Task<IReadOnlyList<SupplierRating>> GetRatingsAsync(Guid supplierId);
}