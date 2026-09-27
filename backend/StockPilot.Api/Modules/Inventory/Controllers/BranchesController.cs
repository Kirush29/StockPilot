using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.Branch;
using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/branches")]
[Authorize]
[Tags("Inventory")]
public class BranchesController(IBranchService branchService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<BranchDto>>>> GetAll()
    {
        var branches = await branchService.GetAllAsync();
        return Ok(ApiResponse<List<BranchDto>>.Ok(branches));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> GetById(Guid id)
    {
        try
        {
            var branch = await branchService.GetByIdAsync(id);
            return Ok(ApiResponse<BranchDto>.Ok(branch));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Branch not found.");
        }
    }

    [HttpPost]
    [Authorize(Policy = "BranchManage")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Create([FromBody] CreateBranchDto dto)
    {
        try
        {
            var branch = await branchService.CreateAsync(dto);
            return Ok(ApiResponse<BranchDto>.Ok(branch, "Branch created successfully."));
        }
        catch (ArgumentException ex)
        {
            ModelState.AddModelError("BranchCode", ex.Message);
            return ValidationProblem(ModelState);
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "BranchManage")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Update(Guid id, [FromBody] UpdateBranchDto dto)
    {
        try
        {
            var branch = await branchService.UpdateAsync(id, dto);
            return Ok(ApiResponse<BranchDto>.Ok(branch, "Branch updated successfully."));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Branch not found.");
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "BranchManage")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> ToggleStatus(Guid id, [FromBody] bool isActive)
    {
        try
        {
            var updatedDto = await branchService.ToggleStatusAsync(id, isActive);
            return Ok(ApiResponse<BranchDto>.Ok(updatedDto, $"Branch {(isActive ? "activated" : "deactivated")} successfully."));
        }
        catch (KeyNotFoundException)
        {
            return Problem(statusCode: 404, title: "Branch not found.");
        }
    }
}
