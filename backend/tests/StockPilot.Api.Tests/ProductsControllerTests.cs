using Microsoft.AspNetCore.Mvc;
using Moq;
using StockPilot.Api.Controllers;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class ProductsControllerTests
{
    [Fact]
    public async Task GetAll_ShouldReturnOkWithProducts()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        var products = new List<Product> { new Product { Id = Guid.NewGuid() }, new Product { Id = Guid.NewGuid() } };
        serviceMock.Setup(s => s.GetAllAsync()).ReturnsAsync(products);

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedProducts = Assert.IsAssignableFrom<IReadOnlyList<Product>>(okResult.Value);
        Assert.Equal(2, returnedProducts.Count);
    }

    [Fact]
    public async Task GetAll_ShouldReturnOkWithEmptyList_WhenNoProductsExist()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        serviceMock.Setup(s => s.GetAllAsync()).ReturnsAsync(new List<Product>());

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedProducts = Assert.IsAssignableFrom<IReadOnlyList<Product>>(okResult.Value);
        Assert.Empty(returnedProducts);
    }

    [Fact]
    public async Task GetById_ShouldReturnOkWithProduct_WhenProductExists()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        var productId = Guid.NewGuid();
        var product = new Product { Id = productId };
        serviceMock.Setup(s => s.GetByIdAsync(productId)).ReturnsAsync(product);

        var result = await controller.GetById(productId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedProduct = Assert.IsType<Product>(okResult.Value);
        Assert.Equal(productId, returnedProduct.Id);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenProductDoesNotExist()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        serviceMock.Setup(s => s.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Product?)null);

        var result = await controller.GetById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ShouldReturnCreatedProduct()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        var product = new Product { Id = Guid.NewGuid() };
        serviceMock.Setup(s => s.CreateAsync(It.IsAny<Product>())).ReturnsAsync(product);

        var result = await controller.Create(product);

        var createdAtActionResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(controller.GetById), createdAtActionResult.ActionName);
        Assert.Equal(product.Id, ((Product)createdAtActionResult.Value!).Id);
    }

    [Fact]
    public async Task Create_ShouldGenerateIdAndTimestamps_WhenMissing()
    {
        var serviceMock = new Mock<IProductService>();
        var controller = new ProductsController(serviceMock.Object);

        var product = new Product { Id = Guid.Empty };
        
        Product capturedProduct = null!;
        serviceMock.Setup(s => s.CreateAsync(It.IsAny<Product>()))
            .Callback<Product>(p => capturedProduct = p)
            .ReturnsAsync((Product p) => p);

        var result = await controller.Create(product);

        Assert.NotEqual(Guid.Empty, capturedProduct.Id);
        Assert.NotEqual(default, capturedProduct.CreatedAt);
        Assert.NotEqual(default, capturedProduct.UpdatedAt);
    }
}
