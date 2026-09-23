using Microsoft.AspNetCore.Mvc;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Product>>> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> GetById(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);

        if (product is null)
        {
            return NotFound();
        }

        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(Product product)
    {
        if (product.Id == Guid.Empty)
        {
            product.Id = Guid.NewGuid();
        }

        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;
        // product.IsActive remains true by default

        var createdProduct = await _productService.CreateAsync(product);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdProduct.Id },
            createdProduct);
    }
}
