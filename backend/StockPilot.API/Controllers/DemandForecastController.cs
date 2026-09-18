using Microsoft.AspNetCore.Mvc;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Sales.Interfaces;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/v1/demand")]
public class DemandForecastController : ControllerBase
{
    private readonly IDemandForecastService _forecastService;

    public DemandForecastController(IDemandForecastService forecastService)
    {
        _forecastService = forecastService;
    }

    /// <summary>
    /// Triggers the Demand Forecast Agent to calculate future demand projections.
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(DemandForecastDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateForecast([FromBody] GenerateForecastRequestDto request, CancellationToken cancellationToken)
    {
        if (request.ProductId == Guid.Empty)
        {
            return BadRequest(new { error = "ProductId is required to generate a demand forecast." });
        }

        var forecast = await _forecastService.GenerateForecastAsync(request, cancellationToken);
        return Ok(forecast);
    }

    /// <summary>
    /// Retrieves the most recent forecast for a specific product and branch.
    /// </summary>
    [HttpGet("latest")]
    [ProducesResponseType(typeof(DemandForecastDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLatestForecast(
        [FromQuery] Guid productId,
        [FromQuery] Guid branchId,
        CancellationToken cancellationToken)
    {
        var forecast = await _forecastService.GetLatestForecastAsync(productId, branchId, cancellationToken);
        if (forecast == null)
        {
            return NotFound(new { message = "No active forecast found for the specified product and branch." });
        }
        return Ok(forecast);
    }

    /// <summary>
    /// Retrieves history of generated forecasts.
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(List<DemandForecastDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetForecastHistory(
        [FromQuery] Guid? branchId,
        [FromQuery] int take = 20,
        CancellationToken cancellationToken = default)
    {
        var history = await _forecastService.GetForecastHistoryAsync(branchId, take, cancellationToken);
        return Ok(history);
    }

    /// <summary>
    /// Gets Reorder Point (ROP) suggestions and alerts for items nearing depletion.
    /// </summary>
    [HttpGet("reorder-suggestions")]
    [ProducesResponseType(typeof(List<ReorderSuggestionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReorderSuggestions(
        [FromQuery] Guid? branchId,
        CancellationToken cancellationToken = default)
    {
        var suggestions = await _forecastService.GetReorderSuggestionsAsync(branchId, cancellationToken);
        return Ok(suggestions);
    }

    /// <summary>
    /// Computes ad-hoc ROP and safety stock metrics for customized scenarios.
    /// </summary>
    [HttpGet("calculate-metrics")]
    [ProducesResponseType(typeof(ReorderSuggestionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CalculateMetrics(
        [FromQuery] Guid productId,
        [FromQuery] Guid branchId,
        [FromQuery] decimal currentStock = 50,
        [FromQuery] int leadTimeDays = 7,
        CancellationToken cancellationToken = default)
    {
        var metrics = await _forecastService.CalculateReorderMetricsAsync(productId, branchId, currentStock, leadTimeDays, cancellationToken);
        return Ok(metrics);
    }
}
