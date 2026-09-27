using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.Inventory;
using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController(IInventoryService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("branch/{branchId:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetByBranch(Guid branchId)
    {
        var result = await service.GetByBranchAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("branch/{branchId:guid}/product/{productId:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<InventoryDto>>> GetByBranchAndProduct(Guid branchId, Guid productId)
    {
        try
        {
            var result = await service.GetByBranchAndProductAsync(branchId, productId);
            return Ok(ApiResponse<InventoryDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("low-stock")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> GetLowStock([FromQuery] Guid? branchId)
    {
        var result = await service.GetLowStockAsync(branchId);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }

    [HttpGet("search")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<InventoryDto>>>> Search([FromQuery] string term)
    {
        var result = await service.SearchAsync(term ?? string.Empty);
        return Ok(ApiResponse<List<InventoryDto>>.Ok(result));
    }
}
