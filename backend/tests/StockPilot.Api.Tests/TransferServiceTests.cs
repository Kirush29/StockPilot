using Microsoft.EntityFrameworkCore;
using Moq;
using StockPilot.Application.DTOs.Transfer;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Exceptions;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Services;
using Xunit;

namespace StockPilot.Api.Tests;

public class TransferServiceTests
{
    private StockPilotDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_WithDifferentBranchForBranchManager_ThrowsForbiddenException()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var userBranchId = Guid.NewGuid();
        var sourceBranchId = Guid.NewGuid();
        var destBranchId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = userBranchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Branches.Add(new Branch { BranchId = sourceBranchId, BranchCode = "B2", Name = "Branch 2", IsActive = true });
        db.Branches.Add(new Branch { BranchId = destBranchId, BranchCode = "B3", Name = "Branch 3", IsActive = true });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.BranchId).Returns(userBranchId);
        currentUserMock.Setup(x => x.Role).Returns("BranchManager");

        var sut = new TransferService(db, currentUserMock.Object);

        var dto = new CreateTransferDto
        {
            SourceBranchId = sourceBranchId,
            DestinationBranchId = destBranchId,
            Items = new List<CreateTransferItemDto>
            {
                new CreateTransferItemDto { ProductId = Guid.NewGuid(), RequestedQuantity = 5 }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<ForbiddenException>(() => sut.CreateAsync(dto, Guid.NewGuid()));
    }

    [Fact]
    public async Task CreateAsync_WithBusinessOwnerRole_AllowsCrossBranchTransfer()
    {
        // Arrange
        using var db = GetInMemoryDbContext();
        var sourceBranchId = Guid.NewGuid();
        var destBranchId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        db.Branches.Add(new Branch { BranchId = sourceBranchId, BranchCode = "B1", Name = "Branch 1", IsActive = true });
        db.Branches.Add(new Branch { BranchId = destBranchId, BranchCode = "B2", Name = "Branch 2", IsActive = true });
        db.Products.Add(new Product { Id = productId, SKU = "P1", Name = "Product 1", IsActive = true });
        db.Users.Add(new User { UserId = Guid.NewGuid(), Username = "owner", FullName = "Owner User", Email = "owner@test.com", PasswordHash = "hash", Role = "BusinessOwner" });
        await db.SaveChangesAsync();

        var currentUserMock = new Mock<ICurrentUserService>();
        currentUserMock.Setup(x => x.Role).Returns("BusinessOwner");

        var sut = new TransferService(db, currentUserMock.Object);

        var dto = new CreateTransferDto
        {
            SourceBranchId = sourceBranchId,
            DestinationBranchId = destBranchId,
            Items = new List<CreateTransferItemDto>
            {
                new CreateTransferItemDto { ProductId = productId, RequestedQuantity = 10 }
            }
        };

        // Act
        var result = await sut.CreateAsync(dto, db.Users.First().UserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(sourceBranchId, result.SourceBranchId);
        Assert.Equal(destBranchId, result.DestinationBranchId);
    }
}
