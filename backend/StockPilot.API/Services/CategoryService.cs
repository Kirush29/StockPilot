using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Category;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class CategoryService(AppDbContext db) : ICategoryService
{
    public async Task<List<CategoryDto>> GetAllAsync() =>
        await db.Categories
            .OrderBy(c => c.Name)
            .Select(c => ToDto(c))
            .ToListAsync();

    public async Task<CategoryDto> GetByIdAsync(Guid id)
    {
        var category = await db.Categories.FindAsync(id)
            ?? throw new KeyNotFoundException($"Category {id} not found.");
        return ToDto(category);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Category name is required.");

        if (await db.Categories.AnyAsync(c => c.Name == dto.Name))
            throw new InvalidOperationException($"Category '{dto.Name}' already exists.");

        var category = new Entities.Category
        {
            CategoryId = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return ToDto(category);
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryDto dto)
    {
        var category = await db.Categories.FindAsync(id)
            ?? throw new KeyNotFoundException($"Category {id} not found.");

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Category name is required.");

        if (await db.Categories.AnyAsync(c => c.Name == dto.Name && c.CategoryId != id))
            throw new InvalidOperationException($"Category '{dto.Name}' already exists.");

        category.Name = dto.Name.Trim();
        category.Description = dto.Description?.Trim();
        category.IsActive = dto.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(category);
    }

    private static CategoryDto ToDto(Entities.Category c) => new()
    {
        CategoryId = c.CategoryId,
        Name = c.Name,
        Description = c.Description,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };
}
