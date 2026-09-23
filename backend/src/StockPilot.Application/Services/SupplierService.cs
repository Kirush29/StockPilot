using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public class SupplierService : ISupplierService
{
    private readonly ISupplierRepository _supplierRepository;

    public SupplierService(ISupplierRepository supplierRepository)
    {
        _supplierRepository = supplierRepository;
    }

    public Task<Supplier?> GetByIdAsync(Guid id)
    {
        return _supplierRepository.GetByIdAsync(id);
    }

    public Task<IReadOnlyList<Supplier>> GetAllAsync()
    {
        return _supplierRepository.GetAllAsync();
    }

    public async Task<Supplier> CreateAsync(Supplier supplier)
    {
        await _supplierRepository.AddAsync(supplier);
        return supplier;
    }

    public async Task<bool> UpdateAsync(Supplier supplier)
    {
        var existingSupplier = await _supplierRepository.GetByIdAsync(supplier.Id);

        if (existingSupplier is null)
        {
            return false;
        }

        await _supplierRepository.UpdateAsync(supplier);
        return true;
    }

    public Task<bool> DeactivateAsync(Guid id)
    {
        return _supplierRepository.DeactivateAsync(id);
    }

    public Task<IReadOnlyList<Supplier>> SearchAsync(string keyword)
    {
        return _supplierRepository.SearchAsync(keyword);
    }

    public async Task<SupplierRating> AddRatingAsync(Guid supplierId, SupplierRating rating)
    {
        var existingSupplier = await _supplierRepository.GetByIdAsync(supplierId);
        if (existingSupplier == null)
        {
            throw new KeyNotFoundException("Supplier not found.");
        }

        rating.Id = Guid.NewGuid();
        rating.SupplierId = supplierId;
        rating.RatedAt = DateTime.UtcNow;
        rating.IsActive = true;

        await _supplierRepository.AddRatingAsync(rating);

        // DO NOT update Supplier.Rating, per constraint: "Do NOT introduce rating aggregation or modify Supplier.Rating unless the existing architecture already requires it."

        return rating;
    }

    public async Task<IReadOnlyList<SupplierRating>> GetRatingsAsync(Guid supplierId)
    {
        var existingSupplier = await _supplierRepository.GetByIdAsync(supplierId);
        if (existingSupplier == null)
        {
            throw new KeyNotFoundException("Supplier not found.");
        }

        return await _supplierRepository.GetRatingsAsync(supplierId);
    }
}