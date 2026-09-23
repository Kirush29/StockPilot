using StockPilot.Domain.Entities;

namespace StockPilot.Application.Interfaces;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Product>> GetAllAsync();
    Task AddAsync(Product product);
}
