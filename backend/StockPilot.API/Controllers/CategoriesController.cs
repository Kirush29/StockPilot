using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Category;
using StockPilot.API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController(ICategoryService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<CategoryDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetById(Guid id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(ApiResponse<CategoryDto>.Ok(result));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Category not found.");
        }
    }

    [HttpPost]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create([FromBody] CreateCategoryDto dto, [FromServices] AppDbContext db)
    {
        if (await db.Categories.AnyAsync(c => c.Name == dto.Name))
        {
            ModelState.AddModelError("Name", "This category name is already in use.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.CategoryId },
            ApiResponse<CategoryDto>.Ok(result, "Category created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(Guid id, [FromBody] UpdateCategoryDto dto, [FromServices] AppDbContext db)
    {
        if (await db.Categories.AnyAsync(c => c.Name == dto.Name && c.CategoryId != id))
        {
            ModelState.AddModelError("Name", "This category name is already in use.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await service.UpdateAsync(id, dto);
            return Ok(ApiResponse<CategoryDto>.Ok(result, "Category updated."));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Category not found.");
        }
    }
}
