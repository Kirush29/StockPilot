using Microsoft.AspNetCore.Mvc;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Sales.Interfaces;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class SalesController : ControllerBase
{
    private readonly ISalesService _salesService;

    public SalesController(ISalesService salesService)
    {
        _salesService = salesService;
    }

    /// <summary>
    /// Records a new sales transaction.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSale([FromBody] CreateSaleDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var sale = await _salesService.CreateSaleAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetSaleById), new { id = sale.Id }, sale);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves sales transactions with optional date and branch filters.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SaleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSales(
        [FromQuery] Guid? branchId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var sales = await _salesService.GetSalesAsync(branchId, startDate, endDate, take, cancellationToken);
        return Ok(sales);
    }

    /// <summary>
    /// Retrieves a single sale transaction by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSaleById(Guid id, CancellationToken cancellationToken)
    {
        var sale = await _salesService.GetSaleByIdAsync(id, cancellationToken);
        if (sale == null)
        {
            return NotFound(new { error = $"Sale with ID {id} was not found." });
        }
        return Ok(sale);
    }

    /// <summary>
    /// Gets sales performance analytics, revenue, top-selling items, and trends.
    /// </summary>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(SalesAnalyticsSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesAnalytics(
        [FromQuery] Guid? branchId,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var analytics = await _salesService.GetSalesAnalyticsAsync(branchId, days, cancellationToken);
        return Ok(analytics);
    }
}
