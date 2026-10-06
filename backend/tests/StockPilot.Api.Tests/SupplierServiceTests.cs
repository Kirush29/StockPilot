using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class SupplierServiceTests
{
    [Fact]
    public async Task CreateAsync_ShouldCreateSupplier()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-100",
            Name = "Test Electronics",
            ContactEmail = "test@electronics.com",
            ContactPhone = "0751234567",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await service.CreateAsync(supplier);

        Assert.NotNull(result);
        Assert.Equal(supplier.Id, result.Id);
        Assert.Equal("SUP-100", result.SupplierCode);
        Assert.Equal("Test Electronics", result.Name);

        repositoryMock.Verify(
            repository => repository.AddAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnSupplier()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplierId = Guid.NewGuid();

        var supplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-101",
            Name = "ABC Electronics",
            ContactEmail = "abc@electronics.com",
            ContactPhone = "0712345678",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(supplierId))
            .ReturnsAsync(supplier);

        var result = await service.GetByIdAsync(supplierId);

        Assert.NotNull(result);
        Assert.Equal(supplierId, result.Id);
        Assert.Equal("SUP-101", result.SupplierCode);
        Assert.Equal("ABC Electronics", result.Name);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateSupplier()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplierId = Guid.NewGuid();

        var existingSupplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-102",
            Name = "Old Supplier Name",
            ContactEmail = "old@supplier.com",
            ContactPhone = "0722222222",
            Address = "Colombo",
            Rating = 3.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var updatedSupplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-102",
            Name = "Updated Supplier Name",
            ContactEmail = "updated@supplier.com",
            ContactPhone = "0722222222",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = existingSupplier.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        };

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(supplierId))
            .ReturnsAsync(existingSupplier);

        var result = await service.UpdateAsync(updatedSupplier);

        Assert.True(result);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(supplierId),
            Times.Once);

        repositoryMock.Verify(
            repository => repository.UpdateAsync(updatedSupplier),
            Times.Once);
    }

    [Fact]
    public async Task DeactivateAsync_ShouldDeactivateSupplier()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplierId = Guid.NewGuid();

        repositoryMock
            .Setup(repository => repository.DeactivateAsync(supplierId))
            .ReturnsAsync(true);

        var result = await service.DeactivateAsync(supplierId);

        Assert.True(result);

        repositoryMock.Verify(
            repository => repository.DeactivateAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllSuppliers()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var suppliers = new List<Supplier>
        {
            new Supplier
            {
                Id = Guid.NewGuid(),
                SupplierCode = "SUP-103",
                Name = "Supplier One",
                ContactEmail = "one@supplier.com",
                ContactPhone = "0711111111",
                Address = "Colombo",
                Rating = 4.50m,
                IsActive = true,
                IsBlocked = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Supplier
        {
                Id = Guid.NewGuid(),
                SupplierCode = "SUP-104",
                Name = "Supplier Two",
                ContactEmail = "two@supplier.com",
                ContactPhone = "0722222222",
                Address = "Kandy",
                Rating = 4.00m,
                IsActive = true,
                IsBlocked = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        repositoryMock
            .Setup(repository => repository.GetAllAsync())
            .ReturnsAsync(suppliers);

            var result = await service.GetAllAsync();

            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Contains(result, supplier => supplier.SupplierCode == "SUP-103");
            Assert.Contains(result, supplier => supplier.SupplierCode == "SUP-104");

        repositoryMock.Verify(
            repository => repository.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_ShouldReturnFalse_WhenSupplierDoesNotExist()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplierId = Guid.NewGuid();

        var supplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-105",
            Name = "Non Existing Supplier",
            ContactEmail = "missing@supplier.com",
            ContactPhone = "0733333333",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(supplierId))
            .ReturnsAsync((Supplier?)null);

        var result = await service.UpdateAsync(supplier);

        Assert.False(result);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(supplierId),
            Times.Once);

        repositoryMock.Verify(
            repository => repository.UpdateAsync(It.IsAny<Supplier>()),
            Times.Never);
    }

    [Fact]
    public async Task DeactivateAsync_ShouldReturnFalse_WhenSupplierDoesNotExist()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);

        var supplierId = Guid.NewGuid();

        repositoryMock
            .Setup(repository => repository.DeactivateAsync(supplierId))
            .ReturnsAsync(false);

        var result = await service.DeactivateAsync(supplierId);

        Assert.False(result);

        repositoryMock.Verify(
            repository => repository.DeactivateAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task SearchAsync_ShouldReturnMatchingSuppliers()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);
        var keyword = "test";
        var suppliers = new List<Supplier> { new Supplier() };

        repositoryMock.Setup(r => r.SearchAsync(keyword)).ReturnsAsync(suppliers);

        var result = await service.SearchAsync(keyword);
        Assert.Single(result);
    }

    [Fact]
    public async Task AddRatingAsync_ShouldAddRating_WhenSupplierExists()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);
        var supplierId = Guid.NewGuid();
        var rating = new SupplierRating { Rating = 4.5m, Comment = "Good" };

        repositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(new Supplier());

        var result = await service.AddRatingAsync(supplierId, rating);

        Assert.Equal(supplierId, result.SupplierId);
        Assert.Equal(4.5m, result.Rating);
        repositoryMock.Verify(r => r.AddRatingAsync(rating), Times.Once);
    }

    [Fact]
    public async Task AddRatingAsync_ShouldThrowException_WhenSupplierDoesNotExist()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);
        var supplierId = Guid.NewGuid();
        
        repositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync((Supplier?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddRatingAsync(supplierId, new SupplierRating()));
    }

    [Fact]
    public async Task GetRatingsAsync_ShouldReturnRatings_WhenSupplierExists()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);
        var supplierId = Guid.NewGuid();
        var ratings = new List<SupplierRating> { new SupplierRating() };

        repositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(new Supplier());
        repositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(ratings);

        var result = await service.GetRatingsAsync(supplierId);

        Assert.Single(result);
    }

    [Fact]
    public async Task GetRatingsAsync_ShouldThrowException_WhenSupplierDoesNotExist()
    {
        var repositoryMock = new Mock<ISupplierRepository>();
        var service = new SupplierService(repositoryMock.Object);
        var supplierId = Guid.NewGuid();
        
        repositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync((Supplier?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetRatingsAsync(supplierId));
    }
}