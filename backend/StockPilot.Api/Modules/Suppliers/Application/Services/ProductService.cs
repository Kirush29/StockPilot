using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;

    public ProductService(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public Task<Product?> GetByIdAsync(Guid id)
    {
        return _productRepository.GetByIdAsync(id);
    }

    public Task<IReadOnlyList<Product>> GetAllAsync()
    {
        return _productRepository.GetAllAsync();
    }

    public async Task<Product> CreateAsync(Product product)
    {
        await _productRepository.AddAsync(product);
        return product;
    }
}
