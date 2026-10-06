using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Npgsql;
using StockPilot.Api.Controllers;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class SuppliersControllerTests
{
    [Fact]
    public async Task GetAll_ShouldReturnOkWithSuppliers()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var suppliers = new List<Supplier>
        {
            new Supplier
            {
                Id = Guid.NewGuid(),
                SupplierCode = "SUP-201",
                Name = "ABC Electronics",
                ContactEmail = "abc@electronics.com",
                ContactPhone = "0712345678",
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
                SupplierCode = "SUP-202",
                Name = "XYZ Suppliers",
                ContactEmail = "xyz@suppliers.com",
                ContactPhone = "0723456789",
                Address = "Kandy",
                Rating = 4.00m,
                IsActive = true,
                IsBlocked = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        serviceMock
            .Setup(service => service.GetAllAsync())
            .ReturnsAsync(suppliers);

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedSuppliers = Assert.IsAssignableFrom<IReadOnlyList<Supplier>>(
            okResult.Value);

        Assert.Equal(2, returnedSuppliers.Count);
        Assert.Contains(
            returnedSuppliers,
            supplier => supplier.SupplierCode == "SUP-201");
        Assert.Contains(
            returnedSuppliers,
            supplier => supplier.SupplierCode == "SUP-202");

        serviceMock.Verify(
            service => service.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task GetById_ShouldReturnOkWithSupplier_WhenSupplierExists()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplierId = Guid.NewGuid();

        var supplier = new Supplier
        {
            Id = supplierId,
            SupplierCode = "SUP-203",
            Name = "ABC Electronics",
            ContactEmail = "abc@electronics.com",
            ContactPhone = "0712345678",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        serviceMock
            .Setup(service => service.GetByIdAsync(supplierId))
            .ReturnsAsync(supplier);

        var result = await controller.GetById(supplierId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedSupplier = Assert.IsType<Supplier>(okResult.Value);

        Assert.Equal(supplierId, returnedSupplier.Id);
        Assert.Equal("SUP-203", returnedSupplier.SupplierCode);
        Assert.Equal("ABC Electronics", returnedSupplier.Name);

        serviceMock.Verify(
            service => service.GetByIdAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task GetById_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplierId = Guid.NewGuid();

        serviceMock
            .Setup(service => service.GetByIdAsync(supplierId))
            .ReturnsAsync((Supplier?)null);

        var result = await controller.GetById(supplierId);

        Assert.IsType<NotFoundResult>(result.Result);

        serviceMock.Verify(
            service => service.GetByIdAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldReturnCreatedAtActionWithSupplier()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            SupplierCode = "SUP-204",
            Name = "New Electronics Supplier",
            ContactEmail = "new@electronics.com",
            ContactPhone = "0751234567",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ReturnsAsync(supplier);

        var result = await controller.Create(supplier);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);

        Assert.Equal(nameof(SuppliersController.GetById), createdResult.ActionName);
        Assert.Equal(supplier.Id, createdResult.RouteValues!["id"]);

        var returnedSupplier = Assert.IsType<Supplier>(createdResult.Value);

        Assert.Equal("SUP-204", returnedSupplier.SupplierCode);
        Assert.Equal("New Electronics Supplier", returnedSupplier.Name);

        serviceMock.Verify(
            service => service.CreateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldGenerateId_WhenSupplierIdIsEmpty()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.Empty,
            SupplierCode = "SUP-205",
            Name = "Generated ID Supplier",
            ContactEmail = "generated@supplier.com",
            ContactPhone = "0761234567",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ReturnsAsync(supplier);

        var result = await controller.Create(supplier);

        Assert.NotEqual(Guid.Empty, supplier.Id);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);

        Assert.Equal(
            nameof(SuppliersController.GetById),
            createdResult.ActionName);

        Assert.Equal(
            supplier.Id,
            createdResult.RouteValues!["id"]);

        serviceMock.Verify(
            service => service.CreateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldSetCreatedAndUpdatedTimestamps()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-206",
            Name = "Timestamp Supplier",
            ContactEmail = "timestamp@supplier.com",
            ContactPhone = "0771234567",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ReturnsAsync(supplier);

        var beforeCreate = DateTime.UtcNow;

        await controller.Create(supplier);

        var afterCreate = DateTime.UtcNow;

        Assert.NotEqual(default, supplier.CreatedAt);
        Assert.NotEqual(default, supplier.UpdatedAt);

        Assert.InRange(
            supplier.CreatedAt,
            beforeCreate,
            afterCreate);

        Assert.InRange(
            supplier.UpdatedAt,
            beforeCreate,
            afterCreate);

        serviceMock.Verify(
            service => service.CreateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldPropagateException_WhenServiceFails()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-207",
            Name = "Exception Test Supplier",
            ContactEmail = "exception@supplier.com",
            ContactPhone = "0781234567",
            Address = "Colombo",
            Rating = 4.00m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ThrowsAsync(new InvalidOperationException("Supplier creation failed."));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => controller.Create(supplier));

        Assert.Equal("Supplier creation failed.", exception.Message);

        serviceMock.Verify(
            service => service.CreateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldPassSupplierToService()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-208",
            Name = "Pass Through Supplier",
            ContactEmail = "passthrough@supplier.com",
            ContactPhone = "0791234567",
            Address = "Colombo",
            Rating = 4.25m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ReturnsAsync(supplier);

        await controller.Create(supplier);

        serviceMock.Verify(
            service => service.CreateAsync(
                It.Is<Supplier>(s =>
                    s.Id == supplier.Id &&
                    s.SupplierCode == "SUP-208" &&
                    s.Name == "Pass Through Supplier" &&
                    s.ContactEmail == "passthrough@supplier.com" &&
                    s.Rating == 4.25m)),
            Times.Once);
    }

    [Fact]
    public async Task GetAll_ShouldReturnOkWithEmptyList_WhenNoSuppliersExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var suppliers = new List<Supplier>();

        serviceMock
            .Setup(service => service.GetAllAsync())
            .ReturnsAsync(suppliers);

        var result = await controller.GetAll();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);

        var returnedSuppliers =
            Assert.IsAssignableFrom<IReadOnlyList<Supplier>>(okResult.Value);

        Assert.Empty(returnedSuppliers);

        serviceMock.Verify(
            service => service.GetAllAsync(),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldKeepExistingId_WhenSupplierIdIsProvided()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var existingId = Guid.NewGuid();

         var supplier = new Supplier
        {
            Id = existingId,
            SupplierCode = "SUP-209",
            Name = "Existing ID Supplier",
            ContactEmail = "existingid@supplier.com",
            ContactPhone = "0701234567",
            Address = "Colombo",
            Rating = 4.25m,
            IsActive = true,
            IsBlocked = false
        };

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ReturnsAsync(supplier);

        await controller.Create(supplier);

        Assert.Equal(existingId, supplier.Id);

        serviceMock.Verify(
            service => service.CreateAsync(
                It.Is<Supplier>(s => s.Id == existingId)),
            Times.Once);
    }

    [Fact]
public async Task GetById_ShouldPassCorrectIdToService()
{
    var serviceMock = new Mock<ISupplierService>();
    var controller = new SuppliersController(serviceMock.Object);

    var requestedId = Guid.NewGuid();

    var supplier = new Supplier
    {
        Id = requestedId,
        SupplierCode = "SUP-210",
        Name = "ID Verification Supplier",
        ContactEmail = "idcheck@supplier.com",
        ContactPhone = "0712345678",
        Address = "Colombo",
        Rating = 4.00m,
        IsActive = true,
        IsBlocked = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    serviceMock
        .Setup(service => service.GetByIdAsync(requestedId))
        .ReturnsAsync(supplier);

    await controller.GetById(requestedId);

    serviceMock.Verify(
        service => service.GetByIdAsync(requestedId),
        Times.Once);
}

    [Fact]
    public async Task Update_ShouldReturnOkAndPassSupplierToService()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-211",
            Name = "Updated Supplier",
            ContactEmail = "updated@supplier.com",
            ContactPhone = "0712345678",
            Address = "Colombo",
            Rating = 4.50m,
            IsActive = true,
            IsBlocked = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = default
        };

        serviceMock
            .Setup(service => service.UpdateAsync(supplier))
            .ReturnsAsync(true);

        var beforeUpdate = DateTime.UtcNow;

        var result = await controller.Update(supplier.Id, supplier);

        var afterUpdate = DateTime.UtcNow;

        Assert.IsType<OkObjectResult>(result);
        Assert.InRange(supplier.UpdatedAt, beforeUpdate, afterUpdate);

        serviceMock.Verify(
            service => service.UpdateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Update_ShouldReturnBadRequest_WhenRouteIdDoesNotMatchSupplierId()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-212",
            Name = "Mismatched Supplier"
        };

        var result = await controller.Update(Guid.NewGuid(), supplier);

        Assert.IsType<BadRequestResult>(result);

        serviceMock.Verify(
            service => service.UpdateAsync(It.IsAny<Supplier>()),
            Times.Never);
    }

    [Fact]
    public async Task Update_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            SupplierCode = "SUP-213",
            Name = "Missing Supplier"
        };

        serviceMock
            .Setup(service => service.UpdateAsync(supplier))
            .ReturnsAsync(false);

        var result = await controller.Update(supplier.Id, supplier);

        Assert.IsType<NotFoundResult>(result);

        serviceMock.Verify(
            service => service.UpdateAsync(supplier),
            Times.Once);
    }

    [Fact]
    public async Task Deactivate_ShouldReturnNoContent_WhenSupplierExists()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplierId = Guid.NewGuid();

        serviceMock
            .Setup(service => service.DeactivateAsync(supplierId))
            .ReturnsAsync(true);

        var result = await controller.Deactivate(supplierId);

        Assert.IsType<NoContentResult>(result);

        serviceMock.Verify(
            service => service.DeactivateAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task Deactivate_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplierId = Guid.NewGuid();

        serviceMock
            .Setup(service => service.DeactivateAsync(supplierId))
            .ReturnsAsync(false);

        var result = await controller.Deactivate(supplierId);

        Assert.IsType<NotFoundResult>(result);

        serviceMock.Verify(
            service => service.DeactivateAsync(supplierId),
            Times.Once);
    }

    [Fact]
    public async Task Create_ShouldReturnConflict_WhenSupplierCodeAlreadyExists()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);

        var supplier = new Supplier
        {
            SupplierCode = "SUP-214",
            Name = "Duplicate Code Supplier"
        };

        var duplicateCodeException = new DbUpdateException(
            "Unable to save supplier.",
            new PostgresException(
                "duplicate key value violates unique constraint",
                "ERROR",
                "ERROR",
                "23505",
                constraintName: "IX_suppliers_SupplierCode"));

        serviceMock
            .Setup(service => service.CreateAsync(supplier))
            .ThrowsAsync(duplicateCodeException);

        var result = await controller.Create(supplier);

        Assert.IsType<ConflictResult>(result.Result);

        serviceMock.Verify(
            service => service.CreateAsync(supplier),
            Times.Once);
    }
    [Fact]
    public async Task Search_ShouldReturnOkWithSuppliers()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);
        var keyword = "test";
        var suppliers = new List<Supplier> { new Supplier() };

        serviceMock.Setup(s => s.SearchAsync(keyword)).ReturnsAsync(suppliers);

        var result = await controller.Search(keyword);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<Supplier>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task CreateRating_ShouldReturnCreatedAtAction_WhenSupplierExists()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);
        var supplierId = Guid.NewGuid();
        var request = new CreateSupplierRatingRequest(4.5m, "Good");
        var createdRating = new SupplierRating { Id = Guid.NewGuid(), SupplierId = supplierId, Rating = 4.5m, Comment = "Good" };

        serviceMock.Setup(s => s.AddRatingAsync(supplierId, It.IsAny<SupplierRating>())).ReturnsAsync(createdRating);

        var result = await controller.CreateRating(supplierId, request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(SuppliersController.GetRatings), createdResult.ActionName);
        var returned = Assert.IsType<SupplierRating>(createdResult.Value);
        Assert.Equal(4.5m, returned.Rating);
    }

    [Fact]
    public async Task CreateRating_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);
        var supplierId = Guid.NewGuid();
        var request = new CreateSupplierRatingRequest(4.5m, "Good");

        serviceMock.Setup(s => s.AddRatingAsync(supplierId, It.IsAny<SupplierRating>())).ThrowsAsync(new KeyNotFoundException());

        var result = await controller.CreateRating(supplierId, request);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetRatings_ShouldReturnOk_WhenSupplierExists()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);
        var supplierId = Guid.NewGuid();
        var ratings = new List<SupplierRating> { new SupplierRating() };

        serviceMock.Setup(s => s.GetRatingsAsync(supplierId)).ReturnsAsync(ratings);

        var result = await controller.GetRatings(supplierId);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IReadOnlyList<SupplierRating>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task GetRatings_ShouldReturnNotFound_WhenSupplierDoesNotExist()
    {
        var serviceMock = new Mock<ISupplierService>();
        var controller = new SuppliersController(serviceMock.Object);
        var supplierId = Guid.NewGuid();

        serviceMock.Setup(s => s.GetRatingsAsync(supplierId)).ThrowsAsync(new KeyNotFoundException());

        var result = await controller.GetRatings(supplierId);

        Assert.IsType<NotFoundResult>(result.Result);
    }
}
