using StockPilot.Domain.Entities;

namespace StockPilot.Application.Interfaces;

public interface ISupplierRepository
{
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Supplier>> GetAllAsync();
    Task AddAsync(Supplier supplier);
    Task UpdateAsync(Supplier supplier);
    Task<bool> DeactivateAsync(Guid id);
    Task<IReadOnlyList<Supplier>> SearchAsync(string keyword);
    Task AddRatingAsync(SupplierRating rating);
    Task<IReadOnlyList<SupplierRating>> GetRatingsAsync(Guid supplierId);
}