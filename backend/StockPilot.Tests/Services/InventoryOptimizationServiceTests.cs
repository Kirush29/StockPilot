using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using StockPilot.API.Data;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;
using StockPilot.API.Services;
using StockPilot.Procurement.Application.Abstractions;
using Xunit;

namespace StockPilot.Tests.Services;

public class InventoryOptimizationServiceTests
{
    private readonly AppDbContext _db;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly Mock<ITransferService> _mockTransferService;
    private readonly Mock<ICurrentUserService> _mockCurrentUserService;
    private readonly Mock<ILogger<InventoryOptimizationService>> _mockLogger;

    public InventoryOptimizationServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _db = new AppDbContext(options);
        _mockServiceProvider = new Mock<IServiceProvider>();
        _mockTransferService = new Mock<ITransferService>();
        _mockCurrentUserService = new Mock<ICurrentUserService>();
        _mockLogger = new Mock<ILogger<InventoryOptimizationService>>();
        
        _mockCurrentUserService.Setup(u => u.UserId).Returns(Guid.NewGuid());
    }

    [Fact]
    public async Task GenerateRecommendationsAsync_NoShortage_ReturnsEmpty()
    {
        // Arrange
        var branch = new Branch { BranchId = Guid.NewGuid(), Name = "Branch 1" };
        var product = new Product { ProductId = Guid.NewGuid(), Name = "Product 1", ReorderLevel = 10 };
        var inventory = new Inventory { InventoryId = Guid.NewGuid(), BranchId = branch.BranchId, ProductId = product.ProductId, QuantityOnHand = 15, ReservedQuantity = 0, Product = product, Branch = branch };
        
        _db.Branches.Add(branch);
        _db.Products.Add(product);
        _db.Inventories.Add(inventory);
        await _db.SaveChangesAsync();

        var service = new InventoryOptimizationService(_db, _mockServiceProvider.Object, _mockTransferService.Object, _mockCurrentUserService.Object, _mockLogger.Object);

        // Act
        var result = await service.GenerateRecommendationsAsync(branch.BranchId);

        // Assert
        Assert.Empty(result);
    }
}
