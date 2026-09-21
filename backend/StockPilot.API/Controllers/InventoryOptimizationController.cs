using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/optimization")]
[Authorize]
public class InventoryOptimizationController(IInventoryOptimizationService service) : ControllerBase
{
    [HttpGet("recommendations")]
    public async Task<ActionResult<ApiResponse<List<AiRecommendation>>>> GetRecommendations([FromQuery] Guid? branchId)
    {
        var result = await service.GetRecommendationsAsync(branchId ?? Guid.Empty); // Update interface soon
        return Ok(ApiResponse<List<AiRecommendation>>.Ok(result));
    }

    [HttpGet("recommendations/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AiRecommendation>>> GetRecommendation(Guid id)
    {
        var result = await service.GetRecommendationAsync(id);
        if (result == null) return NotFound(ApiResponse<AiRecommendation>.Fail("Recommendation not found."));
        return Ok(ApiResponse<AiRecommendation>.Ok(result));
    }

    [HttpPost("analyze")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<List<AiRecommendation>>>> Analyze([FromBody] AnalyzeRequest request)
    {
        var result = await service.GenerateRecommendationsAsync(request.BranchId);
        return Ok(ApiResponse<List<AiRecommendation>>.Ok(result));
    }

    [HttpPost("recommendations/{id:guid}/approve")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<AiRecommendation>>> Approve(Guid id)
    {
        var result = await service.ApproveRecommendationAsync(id);
        return Ok(ApiResponse<AiRecommendation>.Ok(result, "Recommendation approved and transfer created."));
    }

    [HttpPost("recommendations/{id:guid}/reject")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<AiRecommendation>>> Reject(Guid id, [FromBody] RejectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(ApiResponse<AiRecommendation>.Fail("Rejection reason is required."));
        var result = await service.RejectRecommendationAsync(id, request.Reason);
        return Ok(ApiResponse<AiRecommendation>.Ok(result, "Recommendation rejected."));
    }

    [HttpPost("recommendations/{id:guid}/verify")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<AiRecommendation>>> Verify(Guid id)
    {
        var result = await service.VerifyRecommendationAsync(id);
        return Ok(ApiResponse<AiRecommendation>.Ok(result, "Recommendation verification completed."));
    }
}

public class AnalyzeRequest
{
    public Guid BranchId { get; set; }
}

public class RejectRequest
{
    public string Reason { get; set; } = string.Empty;
}
