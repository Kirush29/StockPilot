using Microsoft.AspNetCore.Mvc;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuotationsController : ControllerBase
{
    private readonly IQuotationService _quotationService;

    public QuotationsController(IQuotationService quotationService)
    {
        _quotationService = quotationService;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Quotation>> GetById(Guid id)
    {
        var quotation = await _quotationService.GetByIdAsync(id);

        if (quotation is null)
        {
            return NotFound();
        }

        return Ok(quotation);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Quotation>>> GetAll()
    {
        var quotations = await _quotationService.GetAllAsync();

        return Ok(quotations);
    }

    [HttpPost]
    public async Task<ActionResult<Quotation>> Create(Quotation quotation)
    {
        if (quotation.Id == Guid.Empty)
        {
            quotation.Id = Guid.NewGuid();
        }

        quotation.Status = QuotationStatus.Pending;
        quotation.CreatedAt = DateTime.UtcNow;
        quotation.SubmittedAt = DateTime.UtcNow;

        try
        {
            var createdQuotation = await _quotationService.CreateAsync(quotation);
            return CreatedAtAction(
                nameof(GetById),
                new { id = createdQuotation.Id },
                createdQuotation);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateQuotationStatusRequest request)
    {
        var validStatuses = new[] { QuotationStatus.Pending, QuotationStatus.Accepted, QuotationStatus.Rejected };
        if (!validStatuses.Contains(request.Status))
        {
            return BadRequest("Invalid status.");
        }

        var updated = await _quotationService.UpdateStatusAsync(id, request.Status);

        if (!updated)
        {
            return NotFound();
        }

        return Ok();
    }
    [HttpGet("product/{productId:guid}")]
    public async Task<ActionResult<IReadOnlyList<Quotation>>> GetByProductId(Guid productId)
    {
        var quotations = await _quotationService.GetByProductIdAsync(productId);
        return Ok(quotations);
    }

    [HttpGet("supplier/{supplierId:guid}")]
    public async Task<ActionResult<IReadOnlyList<Quotation>>> GetBySupplierId(Guid supplierId)
    {
        var quotations = await _quotationService.GetBySupplierIdAsync(supplierId);
        return Ok(quotations);
    }

    [HttpGet("compare")]
    public async Task<ActionResult<IReadOnlyList<QuotationComparisonDto>>> CompareQuotations([FromQuery] Guid productId)
    {
        var quotations = await _quotationService.GetByProductIdAsync(productId);
        var result = quotations.Select(q => new QuotationComparisonDto(
            q.Id,
            q.QuotationReference,
            q.SupplierId,
            q.ProductId,
            q.UnitPrice,
            q.Quantity,
            q.DeliveryDays,
            q.Status,
            q.ValidUntil,
            q.SubmittedAt
        )).ToList();

        return Ok(result);
    }
}

public record UpdateQuotationStatusRequest(string Status);

public record QuotationComparisonDto(
    Guid Id,
    string QuotationReference,
    Guid SupplierId,
    Guid ProductId,
    decimal UnitPrice,
    int Quantity,
    int DeliveryDays,
    string Status,
    DateTime ValidUntil,
    DateTime SubmittedAt
);
