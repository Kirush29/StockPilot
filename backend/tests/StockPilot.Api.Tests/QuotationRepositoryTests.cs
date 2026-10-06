using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using Xunit;

namespace StockPilot.Api.Tests;

public class QuotationRepositoryTests
{
    private static StockPilotDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllQuotations()
    {
        await using var dbContext = CreateDbContext();
        var repository = new QuotationRepository(dbContext);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-301",
            Name = "Quotation Supplier",
            ContactEmail = "quotation@supplier.com",
            ContactPhone = "0712345678",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var quotation1 = new Quotation
        {
            Id = Guid.NewGuid(),
            SupplierId = supplier.Id,
            ProductId = Guid.NewGuid(),
            UnitPrice = 1250.00m,
            Quantity = 10,
            DeliveryDays = 3,
            CreatedAt = DateTime.UtcNow,
            ValidUntil = DateTime.UtcNow.AddDays(7),
            SubmittedAt = DateTime.UtcNow
        };

        var quotation2 = new Quotation
        {
            Id = Guid.NewGuid(),
            SupplierId = supplier.Id,
            ProductId = Guid.NewGuid(),
            UnitPrice = 1500.00m,
            Quantity = 5,
            DeliveryDays = 5,
            CreatedAt = DateTime.UtcNow,
            ValidUntil = DateTime.UtcNow.AddDays(14),
            SubmittedAt = DateTime.UtcNow
        };

        await dbContext.Suppliers.AddAsync(supplier);
        await dbContext.Quotations.AddRangeAsync(quotation1, quotation2);
        await dbContext.SaveChangesAsync();

        var result = await repository.GetAllAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, quotation => quotation.Id == quotation1.Id);
        Assert.Contains(result, quotation => quotation.Id == quotation2.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnQuotation()
    {
        await using var dbContext = CreateDbContext();
        var repository = new QuotationRepository(dbContext);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-302",
            Name = "Quotation Lookup Supplier",
            ContactEmail = "lookup@supplier.com",
            ContactPhone = "0712345678",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var quotation = new Quotation
        {
            Id = Guid.NewGuid(),
            SupplierId = supplier.Id,
            ProductId = Guid.NewGuid(),
            UnitPrice = 1250.00m,
            Quantity = 10,
            DeliveryDays = 3,
            CreatedAt = DateTime.UtcNow,
            ValidUntil = DateTime.UtcNow.AddDays(7),
            SubmittedAt = DateTime.UtcNow
        };

        await dbContext.Suppliers.AddAsync(supplier);
        await dbContext.Quotations.AddAsync(quotation);
        await dbContext.SaveChangesAsync();

        var result = await repository.GetByIdAsync(quotation.Id);

        Assert.NotNull(result);
        Assert.Equal(quotation.Id, result.Id);
        Assert.Equal(quotation.SupplierId, result.SupplierId);
        Assert.Equal(quotation.ProductId, result.ProductId);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnNull_WhenQuotationDoesNotExist()
    {
        await using var dbContext = CreateDbContext();
        var repository = new QuotationRepository(dbContext);

        var result = await repository.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task AddAsync_ShouldSaveQuotation()
    {
        await using var dbContext = CreateDbContext();
        var repository = new QuotationRepository(dbContext);

        var supplier = new Supplier { Id = Guid.NewGuid(), SupplierCode = "S1", Name = "S1", ContactEmail = "a@a.com", ContactPhone = "1", Address = "A", Rating = 1, IsActive = true, IsBlocked = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        await dbContext.Suppliers.AddAsync(supplier);
        await dbContext.SaveChangesAsync();

        var quotation = new Quotation { Id = Guid.NewGuid(), SupplierId = supplier.Id, ProductId = Guid.NewGuid(), UnitPrice = 1, Quantity = 1, DeliveryDays = 1, CreatedAt = DateTime.UtcNow, ValidUntil = DateTime.UtcNow, SubmittedAt = DateTime.UtcNow };
        
        await repository.AddAsync(quotation);

        var saved = await dbContext.Quotations.FindAsync(quotation.Id);
        Assert.NotNull(saved);
        Assert.Equal(quotation.Id, saved.Id);
    }
}
