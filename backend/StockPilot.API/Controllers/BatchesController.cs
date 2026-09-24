using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.API.Common;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Batch;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/batches")]
[Authorize]
public class BatchesController(IBatchService service, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
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
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpiring(
        [FromQuery] int days = 30)
    {
        var result = await service.GetExpiringAsync(days);
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpGet("expired")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpired()
    {
        var result = await service.GetExpiredAsync();
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = "BranchManager,StoreEmployee")]
    public async Task<ActionResult<ApiResponse<BatchDto>>> Create([FromBody] CreateBatchDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (!await db.Products.AnyAsync(p => p.ProductId == dto.ProductId && p.IsActive))
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
    [Authorize(Roles = "BranchManager")]
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

    // AI tool endpoint
    [HttpGet("tools/expiring/{branchId:guid}")]
    public async Task<ActionResult<ApiResponse<List<BatchDto>>>> GetExpiringBatches(
        Guid branchId, [FromQuery] int days = 30)
    {
        var result = await service.GetExpiringBatchesAsync(branchId, days);
        return Ok(ApiResponse<List<BatchDto>>.Ok(result));
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
