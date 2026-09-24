using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Product;
using StockPilot.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductDto>>>> GetAll(
        [FromQuery] bool includeInactive = false)
    {
        var result = await service.GetAllAsync(includeInactive);
        return Ok(ApiResponse<List<ProductDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(ApiResponse<ProductDto>.Ok(result));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Product not found.");
        }
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetByBarcode(string barcode)
    {
        try
        {
            var result = await service.GetByBarcodeAsync(barcode);
            return Ok(ApiResponse<ProductDto>.Ok(result));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Product not found.");
        }
    }

    [HttpPost]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductDto dto, [FromServices] AppDbContext db)
    {
        if (await db.Products.AnyAsync(p => p.SKU == dto.SKU))
        {
            ModelState.AddModelError("SKU", "This SKU is already in use.");
        }
        if (!string.IsNullOrWhiteSpace(dto.Barcode) && await db.Products.AnyAsync(p => p.Barcode == dto.Barcode))
        {
            ModelState.AddModelError("Barcode", "This Barcode is already in use.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.ProductId },
                ApiResponse<ProductDto>.Ok(result, "Product created."));
        }
        catch (ArgumentException ex)
        {
            return Problem(statusCode: 400, title: ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, [FromBody] UpdateProductDto dto, [FromServices] AppDbContext db)
    {
        if (await db.Products.AnyAsync(p => p.SKU == dto.SKU && p.ProductId != id))
        {
            ModelState.AddModelError("SKU", "This SKU is already in use.");
        }
        if (!string.IsNullOrWhiteSpace(dto.Barcode) && await db.Products.AnyAsync(p => p.Barcode == dto.Barcode && p.ProductId != id))
        {
            ModelState.AddModelError("Barcode", "This Barcode is already in use.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await service.UpdateAsync(id, dto);
            return Ok(ApiResponse<ProductDto>.Ok(result, "Product updated."));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Product not found.");
        }
        catch (ArgumentException ex)
        {
            return Problem(statusCode: 400, title: ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse>> Deactivate(Guid id)
    {
        try
        {
            await service.DeactivateAsync(id);
            return Ok(ApiResponse.Ok("Product deactivated."));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Product not found.");
        }
    }
}
