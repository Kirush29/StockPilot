using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Services;
using Xunit;

namespace StockPilot.Api.Tests;

// Student 1's test, moved from StockPilot.Tests/Services during integration.
// Only namespaces and Product's key name (ProductId -> Id, from the merged Product entity, D1) changed.
public class InventoryOptimizationServiceTests
{
    private readonly StockPilotDbContext _db;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly Mock<ITransferService> _mockTransferService;
    private readonly Mock<ICurrentUserService> _mockCurrentUserService;
    private readonly Mock<ILogger<InventoryOptimizationService>> _mockLogger;

    public InventoryOptimizationServiceTests()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new StockPilotDbContext(options);
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
        var product = new Product { Id = Guid.NewGuid(), Name = "Product 1", ReorderLevel = 10 };
        var inventory = new Inventory { InventoryId = Guid.NewGuid(), BranchId = branch.BranchId, ProductId = product.Id, QuantityOnHand = 15, ReservedQuantity = 0, Product = product, Branch = branch };

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
