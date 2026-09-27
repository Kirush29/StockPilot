using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.Batch;
using StockPilot.Application.Interfaces;
using StockPilot.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/batches")]
[Authorize]
public class BatchesController(IBatchService service, StockPilotDbContext db, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<BatchDto>>> GetById(Guid id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(ApiResponse<BatchDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("expiring")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpiring(
        [FromQuery] int days = 30)
    {
        var result = await service.GetExpiringAsync(days);
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpGet("expired")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpired()
    {
        var result = await service.GetExpiredAsync();
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Policy = "InventoryManage")]
    public async Task<ActionResult<ApiResponse<BatchDto>>> Create([FromBody] CreateBatchDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (!await db.Products.AnyAsync(p => p.Id == dto.ProductId && p.IsActive))
        {
            ModelState.AddModelError("ProductId", "Product does not exist or is inactive.");
            return ValidationProblem(ModelState);
        }

        if (!await db.Branches.AnyAsync(b => b.BranchId == dto.BranchId && b.IsActive))
        {
            ModelState.AddModelError("BranchId", "Branch does not exist or is inactive.");
            return ValidationProblem(ModelState);
        }

        if (await db.Batches.AnyAsync(b => b.BatchNumber == dto.BatchNumber && b.BranchId == dto.BranchId))
        {
            ModelState.AddModelError("BatchNumber", $"Batch number '{dto.BatchNumber}' already exists at this branch.");
            return ValidationProblem(ModelState);
        }

        if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value <= DateTime.UtcNow)
        {
            ModelState.AddModelError("ExpiryDate", "Expiry date must be in the future for a new batch.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var performedBy = GetUserId();
            var result = await service.CreateAsync(dto, performedBy);
            return CreatedAtAction(nameof(GetById), new { id = result.BatchId },
                ApiResponse<BatchDto>.Ok(result, "Batch created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "InventoryManage")]
    public async Task<ActionResult<ApiResponse<BatchDto>>> Update(Guid id, [FromBody] UpdateBatchDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var result = await service.UpdateAsync(id, dto);
            return Ok(ApiResponse<BatchDto>.Ok(result, "Batch updated."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("tools/expiring/{branchId:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpiringBatches(
        Guid branchId, [FromQuery] int days = 30)
    {
        var result = await service.GetExpiringBatchesAsync(branchId, days);
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    private Guid GetUserId()
    {
        return currentUserService.UserId ?? throw new UnauthorizedAccessException("User identity not found in token.");
    }
}
