using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Infrastructure.Repositories;

public class SupplierRepository : ISupplierRepository
{
    private readonly StockPilotDbContext _dbContext;

    public SupplierRepository(StockPilotDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Supplier?> GetByIdAsync(Guid id)
    {
        var suppliers = await _dbContext.Suppliers
       
            .AsNoTracking()
            .ToListAsync();

         return suppliers.FirstOrDefault(s => s.Id == id);
    }

    public async Task<IReadOnlyList<Supplier>> GetAllAsync()
    {
        return await _dbContext.Suppliers
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task AddAsync(Supplier supplier)
    {
        await _dbContext.Suppliers.AddAsync(supplier);
        await _dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Supplier supplier)
    {
        _dbContext.Suppliers.Update(supplier);
        await _dbContext.SaveChangesAsync();
    }

    public async Task<bool> DeactivateAsync(Guid id)
    {
        var supplier = await _dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id);

        if (supplier is null)
        {
            return false;
        }

        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<IReadOnlyList<Supplier>> SearchAsync(string keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return new List<Supplier>();
        }

        keyword = keyword.ToLower();

        return await _dbContext.Suppliers
            .AsNoTracking()
            .Where(s => s.Name.ToLower().Contains(keyword) || 
                        s.SupplierCode.ToLower().Contains(keyword) || 
                        s.ContactEmail.ToLower().Contains(keyword))
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task AddRatingAsync(SupplierRating rating)
    {
        await _dbContext.SupplierRatings.AddAsync(rating);
        await _dbContext.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<SupplierRating>> GetRatingsAsync(Guid supplierId)
    {
        return await _dbContext.SupplierRatings
            .AsNoTracking()
            .Where(r => r.SupplierId == supplierId)
            .OrderByDescending(r => r.RatedAt)
            .ToListAsync();
    }
}