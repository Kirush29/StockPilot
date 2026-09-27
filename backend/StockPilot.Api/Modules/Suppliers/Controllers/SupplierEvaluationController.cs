using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Application.Models;
using StockPilot.Application.Services;

namespace StockPilot.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[Tags("Suppliers")]
public class SupplierEvaluationController : ControllerBase
{
    private readonly ISupplierEvaluationService _evaluationService;

    public SupplierEvaluationController(ISupplierEvaluationService evaluationService)
    {
        _evaluationService = evaluationService;
    }

    [HttpPost("evaluate")]
    [Authorize(Policy = "ProcurementManage")]
    public async Task<ActionResult<SupplierEvaluationResponseDto>> Evaluate([FromBody] EvaluateQuotationsRequest request)
    {
        try
        {
            var results = await _evaluationService.EvaluateQuotationsAsync(request.ProductId);
            return Ok(results);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}

public class EvaluateQuotationsRequest
{
    public Guid ProductId { get; set; }
}
