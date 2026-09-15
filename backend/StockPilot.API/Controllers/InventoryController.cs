using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.Inventory;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController(IInventoryService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("{branchId:guid}")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetByBranch(Guid branchId)
    {
        var result = await service.GetByBranchAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("{branchId:guid}/product/{productId:guid}")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetByBranchAndProduct(
        Guid branchId, Guid productId)
    {
        var result = await service.GetByBranchAndProductAsync(branchId, productId);
        return Ok(ApiResponse<InventoryDto>.Ok(result));
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetLowStock(
        [FromQuery] Guid? branchId = null)
    {
        var result = await service.GetLowStockAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> Search([FromQuery] string term)
    {
        if (string.IsNullOrWhiteSpace(term))
            return BadRequest(ApiResponse<List<InventoryDto>>.Fail("Search term is required."));
        var result = await service.SearchAsync(term);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    // ── AI tool endpoints (read-only) ────────────────────────────────────────
    [HttpGet("tools/product-stock")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetProductStock(
        [FromQuery] Guid productId, [FromQuery] Guid branchId)
    {
        var result = await service.GetProductStockAsync(productId, branchId);
        if (result == null) return NotFound(ApiResponse<InventoryDto>.Fail("No stock record found."));
        return Ok(ApiResponse<InventoryDto>.Ok(result));
    }

    [HttpGet("tools/branch-inventory/{branchId:guid}")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetBranchInventory(Guid branchId)
    {
        var result = await service.GetBranchInventoryAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("tools/low-stock/{branchId:guid}")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetLowStockProducts(Guid branchId)
    {
        var result = await service.GetLowStockProductsAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }
}
