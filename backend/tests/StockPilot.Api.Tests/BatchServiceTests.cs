using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using StockPilot.Application.DTOs.Batch;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Exceptions;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Services;
using Xunit;

namespace StockPilot.Api.Tests;

public class BatchServiceTests
{
    private StockPilotDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_WithDifferentBranchForBranchManager_ThrowsForbiddenException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var userBranchId = Guid.NewGuid();
        var targetBranchId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = userBranchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Branches.Add(new Branch { BranchId = targetBranchId, BranchCode = "B2", Name = "Branch 2", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.BranchId).Returns(userBranchId);
        currentUserMock.Setup(x => x.Role).Returns("BranchManager");

        var sut = new BatchService(db, currentUserMock.Object);

        var dto = new CreateBatchDto
        {
            BatchNumber = "B-001",
            ProductId = Guid.NewGuid(),
            BranchId = targetBranchId,
            Quantity = 100,
            UnitCost = 10,
            ManufacturingDate = DateTime.UtcNow,
            ExpiryDate = DateTime.UtcNow.AddYears(1)
        };

        // Act & Assert
        await Assert.ThrowsAsync<ForbiddenException>(() => sut.CreateAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_WithBusinessOwnerRole_AllowsCrossBranchBatchCreation()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var targetBranchId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = targetBranchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Products.Add(new Product { Id = productId, SKU = "P1", Name = "Product 1", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.Role).Returns("BusinessOwner");

        var sut = new BatchService(db, currentUserMock.Object);

        var dto = new CreateBatchDto
        {
            BatchNumber = "B-001",
            ProductId = productId,
            BranchId = targetBranchId,
            Quantity = 100,
            UnitCost = 10,
            ManufacturingDate = DateTime.UtcNow,
            ExpiryDate = DateTime.UtcNow.AddYears(1)
        };

        // Act
        var result = await sut.CreateAsync(dto, Guid.NewGuid());

        // Assert
        Assert.NotNull(result);
        Assert.Equal("B-001", result.BatchNumber);
        Assert.Equal(targetBranchId, result.BranchId);
    }
}
