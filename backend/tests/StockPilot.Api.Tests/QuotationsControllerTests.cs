using Microsoft.AspNetCore.Mvc;
using Moq;
using StockPilot.Api.Controllers;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class QuotationsControllerTests
{
    [Fact]
    public async Task GetAll_ShouldReturnOkWithQuotations()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

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

        serviceMock
            .Setup(service => service.GetAllAsync())
            .ReturnsAsync(quotations);

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedQuotations = Assert.IsAssignableFrom<IReadOnlyList<Quotation>>(
            okResult.Value);

        Assert.Equal(2, returnedQuotations.Count);
        Assert.Contains(returnedQuotations, quotation => quotation.Id == quotations[0].Id);
        Assert.Contains(returnedQuotations, quotation => quotation.Id == quotations[1].Id);

        serviceMock.Verify(
            service => service.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task GetAll_ShouldReturnOkWithEmptyList_WhenNoQuotationsExist()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

        var quotations = new List<Quotation>();

        serviceMock
            .Setup(service => service.GetAllAsync())
            .ReturnsAsync(quotations);

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedQuotations = Assert.IsAssignableFrom<IReadOnlyList<Quotation>>(
            okResult.Value);

        Assert.Empty(returnedQuotations);

        serviceMock.Verify(
            service => service.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task GetById_ShouldReturnOkWithQuotation_WhenQuotationExists()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

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

        serviceMock
            .Setup(service => service.GetByIdAsync(quotationId))
            .ReturnsAsync(quotation);

        var result = await controller.GetById(quotationId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedQuotation = Assert.IsType<Quotation>(okResult.Value);

        Assert.Equal(quotationId, returnedQuotation.Id);
        Assert.Equal(quotation.SupplierId, returnedQuotation.SupplierId);

        serviceMock.Verify(
            service => service.GetByIdAsync(quotationId),
            Times.Once);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenQuotationDoesNotExist()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

        var quotationId = Guid.NewGuid();

        serviceMock
            .Setup(service => service.GetByIdAsync(quotationId))
            .ReturnsAsync((Quotation?)null);

        var result = await controller.GetById(quotationId);

        Assert.IsType<NotFoundResult>(result.Result);

        serviceMock.Verify(
            service => service.GetByIdAsync(quotationId),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldReturnCreatedQuotation()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

        var quotation = new Quotation { Id = Guid.NewGuid() };
        
        serviceMock.Setup(s => s.CreateAsync(It.IsAny<Quotation>())).ReturnsAsync(quotation);

        var result = await controller.Create(quotation);

        var createdAtResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(quotation.Id, ((Quotation)createdAtResult.Value!).Id);
    }

    [Fact]
    public async Task Create_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

        serviceMock.Setup(s => s.CreateAsync(It.IsAny<Quotation>()))
            .ThrowsAsync(new KeyNotFoundException("Supplier not found."));

        var result = await controller.Create(new Quotation());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal("Supplier not found.", notFoundResult.Value);
    }

    [Fact]
    public async Task Create_ShouldReturnNotFound_WhenProductDoesNotExist()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);

        serviceMock.Setup(s => s.CreateAsync(It.IsAny<Quotation>()))
            .ThrowsAsync(new KeyNotFoundException("Product not found."));

        var result = await controller.Create(new Quotation());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal("Product not found.", notFoundResult.Value);
    }
    [Fact]
    public async Task UpdateStatus_ShouldReturnOk_WhenUpdateIsSuccessful()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var id = Guid.NewGuid();
        
        serviceMock.Setup(s => s.UpdateStatusAsync(id, QuotationStatus.Accepted)).ReturnsAsync(true);
        
        var result = await controller.UpdateStatus(id, new UpdateQuotationStatusRequest(QuotationStatus.Accepted));
        
        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_ShouldReturnNotFound_WhenQuotationDoesNotExist()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var id = Guid.NewGuid();
        
        serviceMock.Setup(s => s.UpdateStatusAsync(id, QuotationStatus.Accepted)).ReturnsAsync(false);
        
        var result = await controller.UpdateStatus(id, new UpdateQuotationStatusRequest(QuotationStatus.Accepted));
        
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_ShouldReturnBadRequest_WhenStatusIsInvalid()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var id = Guid.NewGuid();
        
        var result = await controller.UpdateStatus(id, new UpdateQuotationStatusRequest("InvalidStatus"));
        
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetByProductId_ShouldReturnOkWithQuotations()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var productId = Guid.NewGuid();
        var quotations = new List<Quotation> { new Quotation { ProductId = productId } };
        
        serviceMock.Setup(s => s.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        
        var result = await controller.GetByProductId(productId);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<Quotation>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task GetBySupplierId_ShouldReturnOkWithQuotations()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var supplierId = Guid.NewGuid();
        var quotations = new List<Quotation> { new Quotation { SupplierId = supplierId } };
        
        serviceMock.Setup(s => s.GetBySupplierIdAsync(supplierId)).ReturnsAsync(quotations);
        
        var result = await controller.GetBySupplierId(supplierId);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<Quotation>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task CompareQuotations_ShouldReturnOkWithMappedDtos()
    {
        var serviceMock = new Mock<IQuotationService>();
        var controller = new QuotationsController(serviceMock.Object);
        var productId = Guid.NewGuid();
        var quotation = new Quotation 
        { 
            Id = Guid.NewGuid(),
            SupplierId = Guid.NewGuid(),
            ProductId = productId,
            UnitPrice = 10m,
            Quantity = 100,
            DeliveryDays = 5,
            Status = QuotationStatus.Pending,
            ValidUntil = DateTime.UtcNow.AddDays(7),
            SubmittedAt = DateTime.UtcNow
        };
        var quotations = new List<Quotation> { quotation };
        
        serviceMock.Setup(s => s.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        
        var result = await controller.CompareQuotations(productId);
        
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<QuotationComparisonDto>>(okResult.Value);
        Assert.Single(returned);
        
        var dto = returned[0];
        Assert.Equal(quotation.Id, dto.Id);
        Assert.Equal(quotation.SupplierId, dto.SupplierId);
        Assert.Equal(quotation.ProductId, dto.ProductId);
        Assert.Equal(quotation.UnitPrice, dto.UnitPrice);
    }
}
