using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.API.Common;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Branch;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/branches")]
[Authorize]
public class BranchesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<BranchDto>>>> GetAll()
    {
        var isOwner = User.IsInRole("BusinessOwner");

        var branches = await db.Branches
            .Where(b => isOwner || b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => new BranchDto
            {
                BranchId    = b.BranchId,
                BranchCode  = b.BranchCode,
                Name        = b.Name,
                Address     = b.Address,
                City        = b.City,
                PhoneNumber = b.PhoneNumber,
                Email       = b.Email,
                ManagerName = b.ManagerName,
                IsActive    = b.IsActive,
            })
            .ToListAsync();

        return Ok(ApiResponse<List<BranchDto>>.Ok(branches));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> GetById(Guid id)
    {
        var isOwner = User.IsInRole("BusinessOwner");
        var branch = await db.Branches
            .Where(b => b.BranchId == id && (isOwner || b.IsActive))
            .Select(b => new BranchDto
            {
                BranchId    = b.BranchId,
                BranchCode  = b.BranchCode,
                Name        = b.Name,
                Address     = b.Address,
                City        = b.City,
                PhoneNumber = b.PhoneNumber,
                Email       = b.Email,
                ManagerName = b.ManagerName,
                IsActive    = b.IsActive,
            })
            .FirstOrDefaultAsync();

        if (branch == null) return Problem(statusCode: 404, title: "Branch not found.");
        return Ok(ApiResponse<BranchDto>.Ok(branch));
    }

    [HttpPost]
    [Authorize(Roles = "BusinessOwner")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Create([FromBody] CreateBranchDto dto)
    {
        if (await db.Branches.AnyAsync(b => b.BranchCode == dto.BranchCode))
        {
            ModelState.AddModelError("BranchCode", "This branch code is already in use.");
            return ValidationProblem(ModelState);
        }

        var branch = new StockPilot.API.Entities.Branch
        {
            BranchId    = Guid.NewGuid(),
            BranchCode  = dto.BranchCode,
            Name        = dto.Name,
            Address     = dto.Address,
            City        = dto.City,
            PhoneNumber = dto.PhoneNumber,
            Email       = dto.Email,
            ManagerName = dto.ManagerName,
            IsActive    = dto.IsActive
        };

        db.Branches.Add(branch);
        await db.SaveChangesAsync();

        var createdDto = new BranchDto
        {
            BranchId    = branch.BranchId,
            BranchCode  = branch.BranchCode,
            Name        = branch.Name,
            Address     = branch.Address,
            City        = branch.City,
            PhoneNumber = branch.PhoneNumber,
            Email       = branch.Email,
            ManagerName = branch.ManagerName,
            IsActive    = branch.IsActive
        };

        return Ok(ApiResponse<BranchDto>.Ok(createdDto, "Branch created successfully."));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "BusinessOwner")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> Update(Guid id, [FromBody] UpdateBranchDto dto)
    {
        var branch = await db.Branches.FindAsync(id);
        if (branch == null) return Problem(statusCode: 404, title: "Branch not found.");

        branch.Name        = dto.Name;
        branch.Address     = dto.Address;
        branch.City        = dto.City;
        branch.PhoneNumber = dto.PhoneNumber;
        branch.Email       = dto.Email;
        branch.ManagerName = dto.ManagerName;
        branch.IsActive    = dto.IsActive;
        branch.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var updatedDto = new BranchDto
        {
            BranchId    = branch.BranchId,
            BranchCode  = branch.BranchCode,
            Name        = branch.Name,
            Address     = branch.Address,
            City        = branch.City,
            PhoneNumber = branch.PhoneNumber,
            Email       = branch.Email,
            ManagerName = branch.ManagerName,
            IsActive    = branch.IsActive
        };

        return Ok(ApiResponse<BranchDto>.Ok(updatedDto, "Branch updated successfully."));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "BusinessOwner")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> ToggleStatus(Guid id, [FromBody] bool isActive)
    {
        var branch = await db.Branches.FindAsync(id);
        if (branch == null) return Problem(statusCode: 404, title: "Branch not found.");

        branch.IsActive  = isActive;
        branch.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var updatedDto = new BranchDto
        {
            BranchId    = branch.BranchId,
            BranchCode  = branch.BranchCode,
            Name        = branch.Name,
            Address     = branch.Address,
            City        = branch.City,
            PhoneNumber = branch.PhoneNumber,
            Email       = branch.Email,
            ManagerName = branch.ManagerName,
            IsActive    = branch.IsActive
        };

        return Ok(ApiResponse<BranchDto>.Ok(updatedDto, $"Branch {(isActive ? "activated" : "deactivated")} successfully."));
    }
}
