using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public interface IProductService
{
    Task<Product?> GetByIdAsync(Guid id);
    Task<IReadOnlyList<Product>> GetAllAsync();
    Task<Product> CreateAsync(Product product);
}
