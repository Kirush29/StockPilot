using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class ProductServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ShouldReturnProduct_WhenRepositoryReturnsProduct()
    {
        var repositoryMock = new Mock<IProductRepository>();
        var service = new ProductService(repositoryMock.Object);

        var productId = Guid.NewGuid();
        var product = new Product
        {
            Id = productId,
            SKU = "PRD-002",
            Name = "Service Test Product",
            Category = "Tools",
            Brand = "BrandY",
            Model = "Model-Y2",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        };

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(productId))
            .ReturnsAsync(product);

        var result = await service.GetByIdAsync(productId);

        Assert.Same(product, result);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(productId),
            Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenRepositoryReturnsNull()
    {
        var repositoryMock = new Mock<IProductRepository>();
        var service = new ProductService(repositoryMock.Object);

        var productId = Guid.NewGuid();

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(productId))
            .ReturnsAsync((Product?)null);

        var result = await service.GetByIdAsync(productId);

        Assert.Null(result);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(productId),
            Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllProducts_WhenRepositoryReturnsProducts()
    {
        var repositoryMock = new Mock<IProductRepository>();
        var service = new ProductService(repositoryMock.Object);

        var products = new List<Product> { new(), new() };

        repositoryMock
            .Setup(repository => repository.GetAllAsync())
            .ReturnsAsync(products);

        var result = await service.GetAllAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnEmptyList_WhenRepositoryReturnsEmptyList()
    {
        var repositoryMock = new Mock<IProductRepository>();
        var service = new ProductService(repositoryMock.Object);

        repositoryMock
            .Setup(repository => repository.GetAllAsync())
            .ReturnsAsync(new List<Product>());

        var result = await service.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task CreateAsync_ShouldDelegateToRepository()
    {
        var repositoryMock = new Mock<IProductRepository>();
        var service = new ProductService(repositoryMock.Object);

        var product = new Product();

        repositoryMock
            .Setup(repository => repository.AddAsync(product))
            .Returns(Task.CompletedTask);

        var result = await service.CreateAsync(product);

        Assert.Same(product, result);
        repositoryMock.Verify(r => r.AddAsync(product), Times.Once);
    }
}
