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
    [HttpGet("{branchId:guid}/recommendations")]
    public async Task<ActionResult<ApiResponse<List<AiRecommendation>>>> GetRecommendations(Guid branchId)
    {
        var result = await service.GetRecommendationsAsync(branchId);
        return Ok(ApiResponse<List<AiRecommendation>>.Ok(result));
    }

    [HttpPost("{branchId:guid}/generate")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<List<AiRecommendation>>>> GenerateRecommendations(Guid branchId)
    {
        var result = await service.GenerateRecommendationsAsync(branchId);
        return Ok(ApiResponse<List<AiRecommendation>>.Ok(result));
    }

    [HttpPost("recommendations/{id:guid}/action")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager,BranchManager")]
    public async Task<ActionResult<ApiResponse<AiRecommendation>>> ActionRecommendation(Guid id, [FromQuery] string action)
    {
        var result = await service.ActionRecommendationAsync(id, action);
        return Ok(ApiResponse<AiRecommendation>.Ok(result, $"Recommendation {action.ToLower()}d successfully."));
    }
}
