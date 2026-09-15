using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.StockMovement;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/stock-movements")]
[Authorize]
public class StockMovementsController(IStockMovementService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StockMovementDto>>> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return Ok(ApiResponse<StockMovementDto>.Ok(result));
    }

    [HttpGet("product/{productId:guid}")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetByProduct(Guid productId)
    {
        var result = await service.GetByProductAsync(productId);
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    [HttpGet("branch/{branchId:guid}")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetByBranch(Guid branchId)
    {
        var result = await service.GetByBranchAsync(branchId);
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    // Only adjustments are created via API — other movement types are system-generated
    [HttpPost("adjustment")]
    [Authorize(Roles = "BranchManager,StoreEmployee")]
    public async Task<ActionResult<ApiResponse<StockMovementDto>>> CreateAdjustment(
        [FromBody] CreateAdjustmentDto dto)
    {
        var performedBy = GetUserId();
        var result = await service.CreateAdjustmentAsync(dto, performedBy);
        return CreatedAtAction(nameof(GetById), new { id = result.StockMovementId },
            ApiResponse<StockMovementDto>.Ok(result, "Stock adjustment recorded."));
    }

    // AUTH-INTEGRATION-POINT: Replace with the auth team's claim type if different.
    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found in token.");
        return Guid.Parse(claim);
    }
}
