using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.Product;
using StockPilot.API.Interfaces;

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
        var result = await service.GetByIdAsync(id);
        return Ok(ApiResponse<ProductDto>.Ok(result));
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetByBarcode(string barcode)
    {
        var result = await service.GetByBarcodeAsync(barcode);
        return Ok(ApiResponse<ProductDto>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create([FromBody] CreateProductDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.ProductId },
            ApiResponse<ProductDto>.Ok(result, "Product created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, [FromBody] UpdateProductDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return Ok(ApiResponse<ProductDto>.Ok(result, "Product updated."));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse>> Deactivate(Guid id)
    {
        await service.DeactivateAsync(id);
        return Ok(ApiResponse.Ok("Product deactivated."));
    }
}
