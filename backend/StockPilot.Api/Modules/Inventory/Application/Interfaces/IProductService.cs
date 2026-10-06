using StockPilot.Application.DTOs.Product;

namespace StockPilot.Application.Interfaces;

// Student 1 (Inventory) product service. Not to be confused with Student 3's
// StockPilot.Application.Services.IProductService, which serves api/supplier-products (D1/D5).
public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync(bool includeInactive = false);
    Task<ProductDto> GetByIdAsync(Guid id);
    Task<ProductDto> GetByBarcodeAsync(string barcode);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto);
    Task DeactivateAsync(Guid id);
}
