using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly StockPilotDbContext _db;

    public ProductsController(IProductService productService, StockPilotDbContext db)
    {
        _productService = productService;
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<Product>> GetById(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);

        if (product is null)
        {
            return NotFound();
        }

        return Ok(product);
    }

    [HttpGet("barcode/{code}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<Product>> GetByBarcode(string code)
    {
        var product = await _db.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.SKU == code || p.Name.ToLower() == code.ToLower());

        if (product is null)
        {
            return NotFound();
        }

        return Ok(product);
    }

    [HttpPost]
    [Authorize(Policy = "InventoryManage")]
    public async Task<ActionResult<Product>> Create(Product product)
    {
        if (product.Id == Guid.Empty)
        {
            product.Id = Guid.NewGuid();
        }

        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;

        var createdProduct = await _productService.CreateAsync(product);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdProduct.Id },
            createdProduct);
    }
}
