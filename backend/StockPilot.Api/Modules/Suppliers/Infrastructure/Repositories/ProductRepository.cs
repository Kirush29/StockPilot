using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly StockPilotDbContext _dbContext;

    public ProductRepository(StockPilotDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Product?> GetByIdAsync(Guid id)
    {
        return await _dbContext.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IReadOnlyList<Product>> GetAllAsync()
    {
        return await _dbContext.Products
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task AddAsync(Product product)
    {
        await _dbContext.Products.AddAsync(product);
        await _dbContext.SaveChangesAsync();
    }
}
