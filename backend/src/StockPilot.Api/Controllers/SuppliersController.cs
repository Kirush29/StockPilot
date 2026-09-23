using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Supplier>>> GetAll()
    {
        var suppliers = await _supplierService.GetAllAsync();

        return Ok(suppliers);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Supplier>> GetById(Guid id)
    {
        var supplier = await _supplierService.GetByIdAsync(id);

        if (supplier is null)
        {
            return NotFound();
        }

        return Ok(supplier);
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> Create(Supplier supplier)
    {
        if (supplier.Id == Guid.Empty)
        {
            supplier.Id = Guid.NewGuid();
        }

        supplier.CreatedAt = DateTime.UtcNow;
        supplier.UpdatedAt = DateTime.UtcNow;

        Supplier createdSupplier;

        try
        {
            createdSupplier = await _supplierService.CreateAsync(supplier);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException
            {
                SqlState: "23505",
                ConstraintName: "IX_suppliers_SupplierCode"
            })
        {
            return Conflict();
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdSupplier.Id },
            createdSupplier);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, Supplier supplier)
    {
        if (id != supplier.Id)
        {
            return BadRequest();
        }

        supplier.UpdatedAt = DateTime.UtcNow;

        var updated = await _supplierService.UpdateAsync(supplier);

        if (!updated)
        {
            return NotFound();
        }

        return Ok(supplier);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var deactivated = await _supplierService.DeactivateAsync(id);

        if (!deactivated)
        {
            return NotFound();
        }

        return NoContent();
    }
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<Supplier>>> Search([FromQuery] string keyword)
    {
        var suppliers = await _supplierService.SearchAsync(keyword);
        return Ok(suppliers);
    }

    [HttpPost("{supplierId:guid}/ratings")]
    public async Task<ActionResult<SupplierRating>> CreateRating(Guid supplierId, [FromBody] CreateSupplierRatingRequest request)
    {
        var rating = new SupplierRating
        {
            Rating = request.Rating,
            Comment = request.Comment ?? string.Empty
        };

        try
        {
            var createdRating = await _supplierService.AddRatingAsync(supplierId, rating);
            return CreatedAtAction(
                nameof(GetRatings),
                new { supplierId = supplierId },
                createdRating);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("{supplierId:guid}/ratings")]
    public async Task<ActionResult<IReadOnlyList<SupplierRating>>> GetRatings(Guid supplierId)
    {
        try
        {
            var ratings = await _supplierService.GetRatingsAsync(supplierId);
            return Ok(ratings);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}

public record CreateSupplierRatingRequest(decimal Rating, string? Comment);
