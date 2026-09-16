using StockPilot.API.DTOs.Product;

namespace StockPilot.API.Interfaces;

public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync(bool includeInactive = false);
    Task<ProductDto> GetByIdAsync(Guid id);
    Task<ProductDto> GetByBarcodeAsync(string barcode);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto);
    Task DeactivateAsync(Guid id);
}
