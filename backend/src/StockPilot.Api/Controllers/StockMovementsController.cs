using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.StockMovement;
using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/stock-movements")]
[Authorize]
public class StockMovementsController(IStockMovementService service, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<StockMovementDto>>> GetById(Guid id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(ApiResponse<StockMovementDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("product/{productId:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetByProduct(Guid productId)
    {
        var result = await service.GetByProductAsync(productId);
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    [HttpGet("branch/{branchId:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<StockMovementDto>>>> GetByBranch(Guid branchId)
    {
        var result = await service.GetByBranchAsync(branchId);
        return Ok(ApiResponse<List<StockMovementDto>>.Ok(result));
    }

    [HttpPost("adjustment")]
    [Authorize(Policy = "InventoryManage")]
    public async Task<ActionResult<ApiResponse<StockMovementDto>>> CreateAdjustment(
        [FromBody] CreateAdjustmentDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var performedBy = GetUserId();
            var result = await service.CreateAdjustmentAsync(dto, performedBy);
            return CreatedAtAction(nameof(GetById), new { id = result.StockMovementId },
                ApiResponse<StockMovementDto>.Ok(result, "Stock adjustment recorded."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    private Guid GetUserId()
    {
        return currentUserService.UserId ?? throw new UnauthorizedAccessException("User identity not found in token.");
    }
}
