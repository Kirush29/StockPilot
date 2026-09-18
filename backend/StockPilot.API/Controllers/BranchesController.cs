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
        var branches = await db.Branches
            .Where(b => b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => new BranchDto
            {
                BranchId   = b.BranchId,
                BranchCode = b.BranchCode,
                Name       = b.Name,
                Address    = b.Address,
                IsActive   = b.IsActive,
            })
            .ToListAsync();

        return Ok(ApiResponse<List<BranchDto>>.Ok(branches));
    }
}
