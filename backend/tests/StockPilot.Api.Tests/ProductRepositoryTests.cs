using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using Xunit;

namespace StockPilot.Api.Tests;

public class ProductRepositoryTests
{
    private static StockPilotDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnProduct_WhenProductExists()
    {
        await using var dbContext = CreateDbContext();
        var repository = new ProductRepository(dbContext);

        var productId = Guid.NewGuid();

        var product = new Product
        {
            Id = productId,
            SKU = "PRD-001",
            Name = "Test Product",
            Category = "Electronics",
            Brand = "TestBrand",
            Model = "Model-X1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await dbContext.Products.AddAsync(product);
        await dbContext.SaveChangesAsync();

        var result = await repository.GetByIdAsync(productId);

        Assert.NotNull(result);
        Assert.Equal(productId, result.Id);
        Assert.Equal("PRD-001", result.SKU);
        Assert.Equal("Test Product", result.Name);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenProductDoesNotExist()
    {
        await using var dbContext = CreateDbContext();
        var repository = new ProductRepository(dbContext);

        var result = await repository.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllProducts()
    {
        await using var dbContext = CreateDbContext();
        var repository = new ProductRepository(dbContext);

        var product1 = new Product { Id = Guid.NewGuid(), SKU = "P1", Name = "P1", Category = "C1", Brand = "B1", Model = "M1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsActive = true };
        var product2 = new Product { Id = Guid.NewGuid(), SKU = "P2", Name = "P2", Category = "C1", Brand = "B1", Model = "M1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsActive = true };

        await dbContext.Products.AddRangeAsync(product1, product2);
        await dbContext.SaveChangesAsync();

        var result = await repository.GetAllAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnEmptyList_WhenNoProductsExist()
    {
        await using var dbContext = CreateDbContext();
        var repository = new ProductRepository(dbContext);

        var result = await repository.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task AddAsync_ShouldSaveProduct()
    {
        await using var dbContext = CreateDbContext();
        var repository = new ProductRepository(dbContext);

        var product = new Product { Id = Guid.NewGuid(), SKU = "P3", Name = "P3", Category = "C1", Brand = "B1", Model = "M1", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, IsActive = true };

        await repository.AddAsync(product);

        var savedProduct = await dbContext.Products.FindAsync(product.Id);
        Assert.NotNull(savedProduct);
        Assert.Equal(product.SKU, savedProduct.SKU);
    }
}
