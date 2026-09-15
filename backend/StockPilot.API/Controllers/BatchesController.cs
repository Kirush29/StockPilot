using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.Batch;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/batches")]
[Authorize]
public class BatchesController(IBatchService service) : ControllerBase
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
        var result = await service.GetByIdAsync(id);
        return Ok(ApiResponse<BatchDto>.Ok(result));
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
        var performedBy = GetUserId();
        var result = await service.CreateAsync(dto, performedBy);
        return CreatedAtAction(nameof(GetById), new { id = result.BatchId },
            ApiResponse<BatchDto>.Ok(result, "Batch created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "BranchManager")]
    public async Task<ActionResult<ApiResponse<BatchDto>>> Update(Guid id, [FromBody] UpdateBatchDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return Ok(ApiResponse<BatchDto>.Ok(result, "Batch updated."));
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
