using Microsoft.EntityFrameworkCore;
using StockPilot.Application.DTOs.Product;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Infrastructure.Services;

// Student 1's ProductService, moved unchanged onto the merged Product entity (D1).
// Only the context type, key name (ProductId -> Id) and navigation name (Category -> CategoryNavigation) differ.
public class ProductService(StockPilotDbContext db) : IProductService
{
    public async Task<List<ProductDto>> GetAllAsync(bool includeInactive = false) =>
        await db.Products
            .Include(p => p.CategoryNavigation)
            .Where(p => includeInactive || p.IsActive)
            .OrderBy(p => p.Name)
            .Select(p => ToDto(p))
            .ToListAsync();

    public async Task<ProductDto> GetByIdAsync(Guid id)
    {
        var product = await db.Products.Include(p => p.CategoryNavigation).FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException($"Product {id} not found.");
        return ToDto(product);
    }

    public async Task<ProductDto> GetByBarcodeAsync(string barcode)
    {
        var product = await db.Products.Include(p => p.CategoryNavigation)
            .FirstOrDefaultAsync(p => p.Barcode == barcode)
            ?? throw new KeyNotFoundException($"Product with barcode '{barcode}' not found.");
        return ToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        ValidateProductFields(dto.Name, dto.SKU, dto.CostPrice, dto.SellingPrice,
            dto.MinimumStockLevel, dto.ReorderLevel, dto.MaximumStockLevel);

        if (!await db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId && c.IsActive))
            throw new ArgumentException("Category does not exist or is inactive.");

        if (await db.Products.AnyAsync(p => p.SKU == dto.SKU))
            throw new InvalidOperationException($"SKU '{dto.SKU}' already exists.");

        if (!string.IsNullOrWhiteSpace(dto.Barcode) &&
            await db.Products.AnyAsync(p => p.Barcode == dto.Barcode))
            throw new InvalidOperationException($"Barcode '{dto.Barcode}' already exists.");

        var product = new Product
        {
            Id = Guid.NewGuid(),
            SKU = dto.SKU.Trim(),
            Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim(),
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            CategoryId = dto.CategoryId,
            Unit = dto.Unit.Trim(),
            MinimumStockLevel = dto.MinimumStockLevel,
            ReorderLevel = dto.ReorderLevel,
            MaximumStockLevel = dto.MaximumStockLevel,
            CostPrice = dto.CostPrice,
            SellingPrice = dto.SellingPrice,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Products.Add(product);
        await db.SaveChangesAsync();

        await db.Entry(product).Reference(p => p.CategoryNavigation).LoadAsync();
        return ToDto(product);
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductDto dto)
    {
        var product = await db.Products.Include(p => p.CategoryNavigation).FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException($"Product {id} not found.");

        ValidateProductFields(dto.Name, dto.SKU, dto.CostPrice, dto.SellingPrice,
            dto.MinimumStockLevel, dto.ReorderLevel, dto.MaximumStockLevel);

        if (!await db.Categories.AnyAsync(c => c.CategoryId == dto.CategoryId && c.IsActive))
            throw new ArgumentException("Category does not exist or is inactive.");

        if (await db.Products.AnyAsync(p => p.SKU == dto.SKU && p.Id != id))
            throw new InvalidOperationException($"SKU '{dto.SKU}' already exists.");

        if (!string.IsNullOrWhiteSpace(dto.Barcode) &&
            await db.Products.AnyAsync(p => p.Barcode == dto.Barcode && p.Id != id))
            throw new InvalidOperationException($"Barcode '{dto.Barcode}' already exists.");

        product.SKU = dto.SKU.Trim();
        product.Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim();
        product.Name = dto.Name.Trim();
        product.Description = dto.Description?.Trim();
        product.CategoryId = dto.CategoryId;
        product.Unit = dto.Unit.Trim();
        product.MinimumStockLevel = dto.MinimumStockLevel;
        product.ReorderLevel = dto.ReorderLevel;
        product.MaximumStockLevel = dto.MaximumStockLevel;
        product.CostPrice = dto.CostPrice;
        product.SellingPrice = dto.SellingPrice;
        product.IsActive = dto.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.CategoryNavigation).LoadAsync();
        return ToDto(product);
    }

    public async Task DeactivateAsync(Guid id)
    {
        var product = await db.Products.FindAsync(id)
            ?? throw new KeyNotFoundException($"Product {id} not found.");
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private static void ValidateProductFields(string name, string sku, decimal costPrice,
        decimal sellingPrice, decimal min, decimal reorder, decimal max)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Product name is required.");
        if (string.IsNullOrWhiteSpace(sku)) throw new ArgumentException("SKU is required.");
        if (costPrice < 0) throw new ArgumentException("Cost price cannot be negative.");
        if (sellingPrice < 0) throw new ArgumentException("Selling price cannot be negative.");
        if (min < 0 || reorder < 0 || max < 0) throw new ArgumentException("Stock levels cannot be negative.");
    }

    private static ProductDto ToDto(Product p) => new()
    {
        ProductId = p.Id,
        SKU = p.SKU,
        Barcode = p.Barcode,
        Name = p.Name,
        Description = p.Description,
        // Supplier-created products (D1) have no Inventory category.
        CategoryId = p.CategoryId ?? Guid.Empty,
        CategoryName = p.CategoryNavigation?.Name ?? string.Empty,
        Unit = p.Unit,
        MinimumStockLevel = p.MinimumStockLevel,
        ReorderLevel = p.ReorderLevel,
        MaximumStockLevel = p.MaximumStockLevel,
        CostPrice = p.CostPrice,
        SellingPrice = p.SellingPrice,
        IsActive = p.IsActive,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
