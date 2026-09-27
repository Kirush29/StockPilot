using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.Product;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using StockPilot.Infrastructure.Repositories;
using Xunit;
using InventoryProductsController = StockPilot.Api.Controllers.ProductsController;
using InventoryProductService = StockPilot.Infrastructure.Services.ProductService;
using SupplierProductService = StockPilot.Application.Services.ProductService;
using SupplierProductsController = StockPilot.Api.Controllers.SupplierProductsController;

namespace StockPilot.Api.Tests;

// D1 verification: Student 1 (Inventory, api/products) and Student 3 (Supplier, api/supplier-products)
// both run on the one merged Product entity / products table.
public class CombinedProductTests
{
    private static StockPilotDbContext NewDb() =>
        new(new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static async Task<Category> SeedCategoryAsync(StockPilotDbContext db, bool isActive = true)
    {
        var category = new Category { CategoryId = Guid.NewGuid(), Name = "Beverages", IsActive = isActive };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    private static CreateProductDto NewCreateDto(Guid categoryId, string sku = "INV-001", string? barcode = "4790001") => new()
    {
        SKU = sku,
        Barcode = barcode,
        Name = "  Mineral Water 1L ",
        Description = " Still water ",
        CategoryId = categoryId,
        Unit = "Bottle",
        MinimumStockLevel = 5,
        ReorderLevel = 10,
        MaximumStockLevel = 100,
        CostPrice = 80,
        SellingPrice = 120
    };

    private static UpdateProductDto ToUpdateDto(CreateProductDto c) => new()
    {
        SKU = c.SKU,
        Barcode = c.Barcode,
        Name = c.Name,
        Description = c.Description,
        CategoryId = c.CategoryId,
        Unit = c.Unit,
        MinimumStockLevel = c.MinimumStockLevel,
        ReorderLevel = c.ReorderLevel,
        MaximumStockLevel = c.MaximumStockLevel,
        CostPrice = c.CostPrice,
        SellingPrice = c.SellingPrice,
        IsActive = true
    };

    private static Product NewSupplierProduct(string sku = "SUP-001") => new()
    {
        Id = Guid.NewGuid(),
        SKU = sku,
        Name = "Supplier Drill",
        Category = "Tools",
        Brand = "BrandX",
        Model = "DX-1",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        IsActive = true
    };

    // ---- Student 1: Inventory product service ----

    [Fact]
    public async Task Inventory_Create_TrimsFields_KeepsDescription_AndLoadsCategory()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);

        var result = await new InventoryProductService(db).CreateAsync(NewCreateDto(category.CategoryId));

        Assert.Equal("Mineral Water 1L", result.Name);
        Assert.Equal("Still water", result.Description);
        Assert.Equal("Beverages", result.CategoryName);
        Assert.Equal("Still water", (await db.Products.SingleAsync()).Description);
    }

    [Fact]
    public async Task Inventory_Create_RejectsMissingOrInactiveCategory()
    {
        using var db = NewDb();
        var inactive = await SeedCategoryAsync(db, isActive: false);
        var service = new InventoryProductService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(NewCreateDto(Guid.NewGuid())));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(NewCreateDto(inactive.CategoryId)));
    }

    [Theory]
    [InlineData(-1, 0, 0, 0, 0)]
    [InlineData(0, -1, 0, 0, 0)]
    [InlineData(0, 0, -1, 0, 0)]
    [InlineData(0, 0, 0, -1, 0)]
    [InlineData(0, 0, 0, 0, -1)]
    public async Task Inventory_Create_RejectsNegativePricesAndStockLevels(
        decimal cost, decimal selling, decimal min, decimal reorder, decimal max)
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var dto = NewCreateDto(category.CategoryId);
        dto.CostPrice = cost; dto.SellingPrice = selling;
        dto.MinimumStockLevel = min; dto.ReorderLevel = reorder; dto.MaximumStockLevel = max;

        await Assert.ThrowsAsync<ArgumentException>(() => new InventoryProductService(db).CreateAsync(dto));
    }

    [Fact]
    public async Task Inventory_Create_RejectsDuplicateSkuAndBarcode()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var service = new InventoryProductService(db);
        await service.CreateAsync(NewCreateDto(category.CategoryId));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(NewCreateDto(category.CategoryId, sku: "INV-001", barcode: null)));
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(NewCreateDto(category.CategoryId, sku: "INV-002", barcode: "4790001")));
    }

    [Fact]
    public async Task Inventory_Update_ChangesFields_AndAllowsKeepingOwnSku()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var service = new InventoryProductService(db);
        var created = await service.CreateAsync(NewCreateDto(category.CategoryId));

        var update = ToUpdateDto(NewCreateDto(category.CategoryId));
        update.Description = "Sparkling";
        update.SellingPrice = 150;
        var result = await service.UpdateAsync(created.ProductId, update);

        Assert.Equal("Sparkling", result.Description);
        Assert.Equal(150, result.SellingPrice);
    }

    [Fact]
    public async Task Inventory_Update_UnknownProduct_ThrowsNotFound()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            new InventoryProductService(db).UpdateAsync(Guid.NewGuid(), ToUpdateDto(NewCreateDto(category.CategoryId))));
    }

    [Fact]
    public async Task Inventory_Deactivate_HidesProductUnlessIncludeInactive()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var service = new InventoryProductService(db);
        var created = await service.CreateAsync(NewCreateDto(category.CategoryId));

        await service.DeactivateAsync(created.ProductId);

        Assert.Empty(await service.GetAllAsync());
        Assert.Single(await service.GetAllAsync(includeInactive: true));
    }

    [Fact]
    public async Task Inventory_GetByBarcode_MatchesBarcodeOnly()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var service = new InventoryProductService(db);
        await service.CreateAsync(NewCreateDto(category.CategoryId));

        Assert.Equal("INV-001", (await service.GetByBarcodeAsync("4790001")).SKU);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetByBarcodeAsync("INV-001"));
    }

    // ---- Student 1: Inventory controller ----

    private static InventoryProductsController NewInventoryController(StockPilotDbContext db)
    {
        var services = new ServiceCollection();
        services.AddControllers();
        return new InventoryProductsController(new InventoryProductService(db))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { RequestServices = services.BuildServiceProvider() }
            }
        };
    }

    [Fact]
    public async Task InventoryController_Update_ReturnsUpdatedProduct()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var created = await new InventoryProductService(db).CreateAsync(NewCreateDto(category.CategoryId));
        var update = ToUpdateDto(NewCreateDto(category.CategoryId));
        update.Name = "Renamed";

        var result = await NewInventoryController(db).Update(created.ProductId, update, db);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("Renamed", Assert.IsType<ApiResponse<ProductDto>>(ok.Value).Data!.Name);
    }

    [Fact]
    public async Task InventoryController_Update_DuplicateSku_ReturnsValidationProblem()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var service = new InventoryProductService(db);
        await service.CreateAsync(NewCreateDto(category.CategoryId, sku: "INV-001", barcode: null));
        var second = await service.CreateAsync(NewCreateDto(category.CategoryId, sku: "INV-002", barcode: null));

        var result = await NewInventoryController(db).Update(second.ProductId, ToUpdateDto(NewCreateDto(category.CategoryId, sku: "INV-001", barcode: null)), db);

        var problem = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
        Assert.Contains("SKU", Assert.IsType<ValidationProblemDetails>(problem.Value).Errors.Keys);
    }

    [Fact]
    public async Task InventoryController_UpdateAndDeactivate_UnknownProduct_Return404()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var controller = NewInventoryController(db);

        var update = await controller.Update(Guid.NewGuid(), ToUpdateDto(NewCreateDto(category.CategoryId)), db);
        var deactivate = await controller.Deactivate(Guid.NewGuid());

        Assert.Equal(404, Assert.IsType<ObjectResult>(update.Result).StatusCode);
        Assert.Equal(404, Assert.IsType<ObjectResult>(deactivate.Result).StatusCode);
    }

    [Fact]
    public async Task InventoryController_Deactivate_ReturnsOk()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var created = await new InventoryProductService(db).CreateAsync(NewCreateDto(category.CategoryId));

        var result = await NewInventoryController(db).Deactivate(created.ProductId);

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.False((await db.Products.SingleAsync()).IsActive);
    }

    // ---- Both modules on the shared products table ----

    [Fact]
    public async Task SupplierProduct_IsListedByInventory_WithEmptyCategory()
    {
        using var db = NewDb();
        await new SupplierProductService(new ProductRepository(db)).CreateAsync(NewSupplierProduct());

        var listed = Assert.Single(await new InventoryProductService(db).GetAllAsync());

        Assert.Equal("SUP-001", listed.SKU);
        Assert.Equal(Guid.Empty, listed.CategoryId);
        Assert.Equal(string.Empty, listed.CategoryName);
    }

    [Fact]
    public async Task InventoryProduct_IsListedBySupplier()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        var created = await new InventoryProductService(db).CreateAsync(NewCreateDto(category.CategoryId));

        var supplierView = await new SupplierProductService(new ProductRepository(db)).GetByIdAsync(created.ProductId);

        Assert.NotNull(supplierView);
        Assert.Equal("INV-001", supplierView!.SKU);
    }

    [Fact]
    public async Task Inventory_Create_RejectsSkuAlreadyUsedBySupplierProduct()
    {
        using var db = NewDb();
        var category = await SeedCategoryAsync(db);
        await new SupplierProductService(new ProductRepository(db)).CreateAsync(NewSupplierProduct("SHARED-1"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new InventoryProductService(db).CreateAsync(NewCreateDto(category.CategoryId, sku: "SHARED-1")));
    }

    // ---- Routes and roles (D1 route split, D3 supplier auth) ----

    private static AuthorizeAttribute[] AuthOn(MemberInfo m) => m.GetCustomAttributes<AuthorizeAttribute>().ToArray();

    private static MethodInfo Action<T>(string name) => typeof(T).GetMethod(name)!;

    [Fact]
    public void InventoryController_KeepsStudent1RouteVerbsAndRoles()
    {
        Assert.Equal("api/products", typeof(InventoryProductsController).GetCustomAttribute<RouteAttribute>()!.Template);
        Assert.NotEmpty(AuthOn(typeof(InventoryProductsController)));

        foreach (var (name, verb) in new[] { ("Create", typeof(HttpPostAttribute)), ("Update", typeof(HttpPutAttribute)), ("Deactivate", typeof(HttpDeleteAttribute)) })
        {
            var action = Action<InventoryProductsController>(name);
            Assert.NotNull(action.GetCustomAttribute(verb));
            Assert.Equal("BusinessOwner,ProcurementManager", Assert.Single(AuthOn(action)).Roles);
        }
        foreach (var name in new[] { "GetAll", "GetById", "GetByBarcode" })
            Assert.Empty(AuthOn(Action<InventoryProductsController>(name)));
    }

    [Fact]
    public void SupplierProductsController_StaysOnSupplierRoute_WithD3Auth()
    {
        Assert.Equal("api/supplier-products", typeof(SupplierProductsController).GetCustomAttribute<RouteAttribute>()!.Template);
        Assert.NotEmpty(AuthOn(typeof(SupplierProductsController)));
        Assert.Empty(AuthOn(Action<SupplierProductsController>("GetAll")));
        Assert.Empty(AuthOn(Action<SupplierProductsController>("GetById")));
        Assert.Equal("ProcurementManage", Assert.Single(AuthOn(Action<SupplierProductsController>("Create"))).Policy);
    }

    [Theory]
    [InlineData(typeof(StockPilot.Api.Controllers.SuppliersController))]
    [InlineData(typeof(StockPilot.Api.Controllers.QuotationsController))]
    [InlineData(typeof(StockPilot.Api.Controllers.SupplierEvaluationController))]
    [InlineData(typeof(SupplierProductsController))]
    public void SupplierControllers_D3_ReadsNeedLoginOnly_WritesNeedProcurementManage(Type controller)
    {
        Assert.NotEmpty(AuthOn(controller));
        var actions = controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<HttpMethodAttribute>().Any());

        foreach (var action in actions)
        {
            var isRead = action.GetCustomAttribute<HttpGetAttribute>() is not null;
            var policies = AuthOn(action).Select(a => a.Policy).ToArray();
            if (isRead)
                Assert.Empty(policies);
            else
                Assert.Equal("ProcurementManage", Assert.Single(policies));
        }
    }
}
