using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using Xunit;

namespace StockPilot.Api.Tests;

public class SupplierRepositoryTests
{
    private static StockPilotDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task AddAsync_ShouldSaveSupplier()
    {
        await using var dbContext = CreateDbContext();
        var repository = new SupplierRepository(dbContext);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-001",
            Name = "Test Supplier",
            ContactEmail = "test@supplier.com",
            ContactPhone = "0771234567",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(supplier);

        var savedSupplier = await dbContext.Suppliers
            .FirstOrDefaultAsync(s => s.Id == supplier.Id);

        Assert.NotNull(savedSupplier);
        Assert.Equal("SUP-001", savedSupplier.SupplierCode);
        Assert.Equal("Test Supplier", savedSupplier.Name);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnSupplier()
    {
        await using var dbContext = CreateDbContext();
        var repository = new SupplierRepository(dbContext);

        var supplierId = Guid.NewGuid();

        var supplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-002",
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

        await repository.AddAsync(supplier);

        var result = await repository.GetByIdAsync(supplierId);

        Assert.NotNull(result);
        Assert.Equal(supplierId, result.Id);
        Assert.Equal("SUP-002", result.SupplierCode);
        Assert.Equal("ABC Electronics", result.Name);
    }
    
    [Fact]
    public async Task UpdateAsync_ShouldUpdateSupplier()
    {
        await using var dbContext = CreateDbContext();
        var repository = new SupplierRepository(dbContext);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-005",
            Name = "Old Supplier Name",
            ContactEmail = "old@supplier.com",
            ContactPhone = "0733333333",
            Address = "Colombo",
            Rating = 3.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(supplier);

        supplier.Name = "Updated Supplier Name";
        supplier.ContactEmail = "updated@supplier.com";
        supplier.Rating = 4.50m;
        supplier.UpdatedAt = DateTime.UtcNow;

        await repository.UpdateAsync(supplier);

        var updatedSupplier = await repository.GetByIdAsync(supplier.Id);

        Assert.NotNull(updatedSupplier);
        Assert.Equal("Updated Supplier Name", updatedSupplier.Name);
        Assert.Equal("updated@supplier.com", updatedSupplier.ContactEmail);
        Assert.Equal(4.50m, updatedSupplier.Rating);
    }

    [Fact]
    public async Task DeactivateAsync_ShouldSetSupplierAsInactive()
    {
        await using var dbContext = CreateDbContext();
        var repository = new SupplierRepository(dbContext);

        var supplierId = Guid.NewGuid();

        var supplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-006",
            Name = "Inactive Test Supplier",
            ContactEmail = "inactive@supplier.com",
            ContactPhone = "0744444444",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(supplier);

        var result = await repository.DeactivateAsync(supplierId);

        var deactivatedSupplier = await repository.GetByIdAsync(supplierId);

        Assert.True(result);
        Assert.NotNull(deactivatedSupplier);
        Assert.False(deactivatedSupplier.IsActive);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllSuppliers()
    {
        await using var dbContext = CreateDbContext();
        var repository = new SupplierRepository(dbContext);

        var supplier1 = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-003",
            Name = "Supplier One",
            ContactEmail = "one@supplier.com",
            ContactPhone = "0711111111",
            Address = "Colombo",
            Rating = 4.20m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

         var supplier2 = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-004",
            Name = "Supplier Two",
            ContactEmail = "two@supplier.com",
            ContactPhone = "0722222222",
            Address = "Kandy",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(supplier1);
        await repository.AddAsync(supplier2);

        var result = await repository.GetAllAsync();

        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Contains(result, s => s.SupplierCode == "SUP-003");
        Assert.Contains(result, s => s.SupplierCode == "SUP-004");
    }
}