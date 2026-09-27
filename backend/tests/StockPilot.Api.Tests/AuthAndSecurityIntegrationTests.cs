using Microsoft.EntityFrameworkCore;
using Moq;
using StockPilot.Api.Controllers;
using StockPilot.Application.DTOs.Auth;
using StockPilot.Application.DTOs.Batch;
using StockPilot.Application.DTOs.Branch;
using StockPilot.Application.DTOs.StockMovement;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Enums;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Services;
using System.Security.Claims;
using Xunit;

namespace StockPilot.Api.Tests;

public class AuthAndSecurityIntegrationTests
{
    private StockPilotDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task GetMe_WithoutTokenOrClaim_ReturnsUnauthorized()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var configMock = new Mock<Microsoft.Extensions.Configuration.IConfiguration>();
        var controller = new AuthController(db, configMock.Object);
        controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext() // No user identity claims
        };

        // Act
        var result = await controller.GetMe();

        // Assert
        Assert.IsType<Microsoft.AspNetCore.Mvc.UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task BranchTampering_ThroughRequestBranchId_ThrowsForbiddenException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var userBranchId = Guid.NewGuid();
        var otherBranchId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = userBranchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Branches.Add(new Branch { BranchId = otherBranchId, BranchCode = "B2", Name = "Branch 2", IsActive = true });
        db.Products.Add(new Product { Id = productId, SKU = "P1", Name = "Product 1", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.BranchId).Returns(userBranchId);
        currentUserMock.Setup(x => x.Role).Returns("BranchManager");

        var movementService = new StockMovementService(db, currentUserMock.Object);

        var dto = new CreateAdjustmentDto
        {
            ProductId = productId,
            BranchId = otherBranchId, // Tampered branch ID
            MovementType = MovementType.Adjustment,
            Quantity = 5,
            Reason = "Testing tampering"
        };

        // Act & Assert
        await Assert.ThrowsAsync<StockPilot.Domain.Exceptions.ForbiddenException>(() => movementService.CreateAdjustmentAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task DuplicateBranchCode_ThrowsArgumentException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        db.Branches.Add(new Branch { BranchId = Guid.NewGuid(), BranchCode = "MAIN", Name = "Main Branch", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.Role).Returns("BusinessOwner");

        var branchService = new BranchService(db, currentUserMock.Object);

        var dto = new CreateBranchDto
        {
            BranchCode = "MAIN", // Duplicate code
            Name = "Duplicate Branch",
            IsActive = true
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => branchService.CreateAsync(dto));
    }

    [Fact]
    public async Task InvalidBatchExpiryDate_ThrowsArgumentException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var branchId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = branchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Products.Add(new Product { Id = productId, SKU = "P1", Name = "Product 1", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.Role).Returns("BusinessOwner");

        var batchService = new BatchService(db, currentUserMock.Object);

        var dto = new CreateBatchDto
        {
            BatchNumber = "B-PAST",
            ProductId = productId,
            BranchId = branchId,
            Quantity = 10,
            UnitCost = 5,
            ExpiryDate = DateTime.UtcNow.AddDays(-1) // Expiry in the past
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => batchService.CreateAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task ExcessiveStockDecrease_ThrowsInvalidOperationException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var branchId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = branchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Products.Add(new Product { Id = productId, SKU = "P1", Name = "Product 1", IsActive = true });
        db.Inventories.Add(new Inventory { InventoryId = Guid.NewGuid(), ProductId = productId, BranchId = branchId, QuantityOnHand = 5, ReservedQuantity = 0 });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.Role).Returns("BusinessOwner");

        var movementService = new StockMovementService(db, currentUserMock.Object);

        var dto = new CreateAdjustmentDto
        {
            ProductId = productId,
            BranchId = branchId,
            MovementType = MovementType.Adjustment,
            Quantity = 100, // Excessive quantity (available only 5)
            Reason = "Excessive decrease test"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => movementService.CreateAdjustmentAsync(dto, Guid.NewGuid()));
    }
}
