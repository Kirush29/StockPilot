using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.Category;
using StockPilot.API.Interfaces;

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
        var result = await service.GetByIdAsync(id);
        return Ok(ApiResponse<CategoryDto>.Ok(result));
    }

    [HttpPost]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create([FromBody] CreateCategoryDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.CategoryId },
            ApiResponse<CategoryDto>.Ok(result, "Category created."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "BusinessOwner,ProcurementManager")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(Guid id, [FromBody] UpdateCategoryDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return Ok(ApiResponse<CategoryDto>.Ok(result, "Category updated."));
    }
}
