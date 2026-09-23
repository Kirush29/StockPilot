using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class QuotationServiceTests
{
    [Fact]
    public async Task GetAllAsync_ShouldReturnAllQuotations()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotations = new List<Quotation>
        {
            new()
            {
                Id = Guid.NewGuid(),
                SupplierId = Guid.NewGuid(),
                ProductId = Guid.NewGuid(),
                UnitPrice = 1250.00m,
                Quantity = 10,
                DeliveryDays = 3
            },
            new()
            {
                Id = Guid.NewGuid(),
                SupplierId = Guid.NewGuid(),
                ProductId = Guid.NewGuid(),
                UnitPrice = 1500.00m,
                Quantity = 5,
                DeliveryDays = 5
            }
        };

        repositoryMock
            .Setup(repository => repository.GetAllAsync())
            .ReturnsAsync(quotations);

        var result = await service.GetAllAsync();

        Assert.Equal(2, result.Count);
        Assert.Contains(result, quotation => quotation.Id == quotations[0].Id);
        Assert.Contains(result, quotation => quotation.Id == quotations[1].Id);

        repositoryMock.Verify(
            repository => repository.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnQuotation()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotationId = Guid.NewGuid();
        var quotation = new Quotation
        {
            Id = quotationId,
            SupplierId = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
            UnitPrice = 1250.00m,
            Quantity = 10,
            DeliveryDays = 3
        };

        repositoryMock
            .Setup(repository => repository.GetByIdAsync(quotationId))
            .ReturnsAsync(quotation);

        var result = await service.GetByIdAsync(quotationId);

        Assert.Same(quotation, result);

        repositoryMock.Verify(
            repository => repository.GetByIdAsync(quotationId),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateQuotation_WhenSupplierAndProductExist()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotation = new Quotation { SupplierId = Guid.NewGuid(), ProductId = Guid.NewGuid() };
        
        supplierMock.Setup(s => s.GetByIdAsync(quotation.SupplierId)).ReturnsAsync(new Supplier());
        productMock.Setup(p => p.GetByIdAsync(quotation.ProductId)).ReturnsAsync(new Product());
        
        var result = await service.CreateAsync(quotation);

        Assert.Same(quotation, result);
        repositoryMock.Verify(r => r.AddAsync(quotation), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ShouldFail_WhenSupplierDoesNotExist()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotation = new Quotation { SupplierId = Guid.NewGuid(), ProductId = Guid.NewGuid() };
        
        supplierMock.Setup(s => s.GetByIdAsync(quotation.SupplierId)).ReturnsAsync((Supplier?)null);
        
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateAsync(quotation));
        repositoryMock.Verify(r => r.AddAsync(It.IsAny<Quotation>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ShouldFail_WhenProductDoesNotExist()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotation = new Quotation { SupplierId = Guid.NewGuid(), ProductId = Guid.NewGuid() };
        
        supplierMock.Setup(s => s.GetByIdAsync(quotation.SupplierId)).ReturnsAsync(new Supplier());
        productMock.Setup(p => p.GetByIdAsync(quotation.ProductId)).ReturnsAsync((Product?)null);
        
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateAsync(quotation));
        repositoryMock.Verify(r => r.AddAsync(It.IsAny<Quotation>()), Times.Never);
    }
    [Fact]
    public async Task UpdateStatusAsync_ShouldUpdateStatusAndReturnTrue_WhenQuotationExists()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotationId = Guid.NewGuid();
        var quotation = new Quotation { Id = quotationId, Status = QuotationStatus.Pending };
        
        repositoryMock.Setup(r => r.GetByIdAsync(quotationId)).ReturnsAsync(quotation);
        
        var result = await service.UpdateStatusAsync(quotationId, QuotationStatus.Accepted);

        Assert.True(result);
        Assert.Equal(QuotationStatus.Accepted, quotation.Status);
        repositoryMock.Verify(r => r.UpdateAsync(quotation), Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_ShouldReturnFalse_WhenQuotationDoesNotExist()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var quotationId = Guid.NewGuid();
        
        repositoryMock.Setup(r => r.GetByIdAsync(quotationId)).ReturnsAsync((Quotation?)null);
        
        var result = await service.UpdateStatusAsync(quotationId, QuotationStatus.Accepted);

        Assert.False(result);
        repositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Quotation>()), Times.Never);
    }

    [Fact]
    public async Task GetByProductIdAsync_ShouldReturnQuotations()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var productId = Guid.NewGuid();
        var quotations = new List<Quotation> { new Quotation { ProductId = productId } };
        
        repositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        
        var result = await service.GetByProductIdAsync(productId);

        Assert.Single(result);
        Assert.Equal(productId, result[0].ProductId);
    }

    [Fact]
    public async Task GetBySupplierIdAsync_ShouldReturnQuotations()
    {
        var repositoryMock = new Mock<IQuotationRepository>();
        var supplierMock = new Mock<ISupplierRepository>();
        var productMock = new Mock<IProductRepository>();
        var service = new QuotationService(repositoryMock.Object, supplierMock.Object, productMock.Object);

        var supplierId = Guid.NewGuid();
        var quotations = new List<Quotation> { new Quotation { SupplierId = supplierId } };
        
        repositoryMock.Setup(r => r.GetBySupplierIdAsync(supplierId)).ReturnsAsync(quotations);
        
        var result = await service.GetBySupplierIdAsync(supplierId);

        Assert.Single(result);
        Assert.Equal(supplierId, result[0].SupplierId);
    }
}
