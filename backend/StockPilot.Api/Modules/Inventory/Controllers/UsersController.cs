using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.Application.DTOs;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "UserManage")]
[Tags("Identity")]
public class UsersController(StockPilotDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers([FromQuery] string? search)
    {
        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u => u.Username.ToLower().Contains(searchLower) ||
                                     u.FullName.ToLower().Contains(searchLower) ||
                                     u.Email.ToLower().Contains(searchLower) ||
                                     u.EmployeeNumber.ToLower().Contains(searchLower));
        }

        var users = await query
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                Username = u.Username,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Address = u.Address,
                District = u.District,
                Role = u.Role,
                EmployeeNumber = u.EmployeeNumber,
                BranchId = u.BranchId,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(Guid id)
    {
        var u = await db.Users.FindAsync(id);
        if (u == null) return NotFound();

        return Ok(new UserDto
        {
            UserId = u.UserId,
            Username = u.Username,
            FullName = u.FullName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
            Address = u.Address,
            District = u.District,
            Role = u.Role,
            EmployeeNumber = u.EmployeeNumber,
            BranchId = u.BranchId,
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        if ((dto.Role == "BranchManager" || dto.Role == "StoreEmployee") && dto.BranchId == null)
        {
            ModelState.AddModelError("BranchId", "Branch is required for this role.");
            return ValidationProblem(ModelState);
        }

        if (dto.Role == "StoreEmployee" && string.IsNullOrWhiteSpace(dto.EmployeeNumber))
        {
            ModelState.AddModelError("EmployeeNumber", "Employee number is required.");
            return ValidationProblem(ModelState);
        }

        if (await db.Users.AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower()))
        {
            return Conflict(new { Message = "Username is already taken." });
        }
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            return Conflict(new { Message = "Email address is already registered." });
        }
        if (!string.IsNullOrWhiteSpace(dto.EmployeeNumber) && await db.Users.AnyAsync(u => u.EmployeeNumber.ToLower() == dto.EmployeeNumber.ToLower()))
        {
            return Conflict(new { Message = "Employee number is already assigned." });
        }

        var normalizedPhone = NormalizePhone(dto.PhoneNumber);

        var user = new User
        {
            UserId = Guid.NewGuid(),
            FullName = dto.FullName,
            Username = dto.Username,
            Email = dto.Email,
            PhoneNumber = normalizedPhone,
            Address = dto.Address,
            District = dto.District,
            Role = dto.Role,
            EmployeeNumber = string.IsNullOrWhiteSpace(dto.EmployeeNumber) ? string.Empty : dto.EmployeeNumber.ToUpper(),
            BranchId = dto.BranchId,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            MustChangePassword = true
        };

        var hasher = new PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, "TempPassword123!"); // Temporary password

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUser), new { id = user.UserId }, new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Address = user.Address,
            District = user.District,
            Role = user.Role,
            EmployeeNumber = user.EmployeeNumber,
            BranchId = user.BranchId,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if ((dto.Role == "BranchManager" || dto.Role == "StoreEmployee") && dto.BranchId == null)
        {
            ModelState.AddModelError("BranchId", "Branch is required for this role.");
            return ValidationProblem(ModelState);
        }

        if (dto.Role == "StoreEmployee" && string.IsNullOrWhiteSpace(dto.EmployeeNumber))
        {
            ModelState.AddModelError("EmployeeNumber", "Employee number is required.");
            return ValidationProblem(ModelState);
        }

        if (await db.Users.AnyAsync(u => u.UserId != id && u.Username.ToLower() == dto.Username.ToLower()))
        {
            return Conflict(new { Message = "Username is already taken." });
        }
        if (await db.Users.AnyAsync(u => u.UserId != id && u.Email.ToLower() == dto.Email.ToLower()))
        {
            return Conflict(new { Message = "Email address is already registered." });
        }
        if (!string.IsNullOrWhiteSpace(dto.EmployeeNumber) && await db.Users.AnyAsync(u => u.UserId != id && u.EmployeeNumber.ToLower() == dto.EmployeeNumber.ToLower()))
        {
            return Conflict(new { Message = "Employee number is already assigned." });
        }

        if (user.Role == "BusinessOwner" && dto.Role != "BusinessOwner")
        {
            var businessOwnersCount = await db.Users.CountAsync(u => u.Role == "BusinessOwner" && u.IsActive);
            if (businessOwnersCount <= 1)
            {
                return Conflict(new { Message = "Cannot change role of the last Business Owner." });
            }
        }

        var currentUserIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!dto.IsActive && currentUserIdString == id.ToString())
        {
             return Conflict(new { Message = "You cannot deactivate your own account." });
        }

        if (user.Role == "BusinessOwner" && !dto.IsActive)
        {
            var activeBusinessOwners = await db.Users.CountAsync(u => u.Role == "BusinessOwner" && u.IsActive && u.UserId != id);
            if (activeBusinessOwners == 0)
            {
                 return Conflict(new { Message = "Cannot deactivate the last active Business Owner." });
            }
        }

        user.FullName = dto.FullName;
        user.Username = dto.Username;
        user.Email = dto.Email;
        user.PhoneNumber = NormalizePhone(dto.PhoneNumber);
        user.Address = dto.Address;
        user.District = dto.District;
        user.Role = dto.Role;
        user.EmployeeNumber = string.IsNullOrWhiteSpace(dto.EmployeeNumber) ? string.Empty : dto.EmployeeNumber.ToUpper();
        user.BranchId = dto.BranchId;
        user.IsActive = dto.IsActive;

        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var currentUserIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!dto.IsActive && currentUserIdString == id.ToString())
        {
             return Conflict(new { Message = "You cannot deactivate your own account." });
        }

        if (user.Role == "BusinessOwner" && !dto.IsActive)
        {
            var activeBusinessOwners = await db.Users.CountAsync(u => u.Role == "BusinessOwner" && u.IsActive && u.UserId != id);
            if (activeBusinessOwners == 0)
            {
                 return Conflict(new { Message = "Cannot deactivate the last active Business Owner." });
            }
        }

        user.IsActive = dto.IsActive;
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordAdminDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var hasher = new PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);
        user.MustChangePassword = true;

        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await db.Users
            .Include(u => u.StockMovements)
            .Include(u => u.RequestedTransfers)
            .Include(u => u.ApprovedTransfers)
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user == null) return NotFound();

        var currentUserIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (currentUserIdString == id.ToString())
        {
             return Conflict(new { Message = "You cannot delete your own account." });
        }

        if (user.Role == "BusinessOwner")
        {
            var activeBusinessOwners = await db.Users.CountAsync(u => u.Role == "BusinessOwner" && u.UserId != id);
            if (activeBusinessOwners == 0)
            {
                 return Conflict(new { Message = "Cannot delete the last Business Owner." });
            }
        }

        if (user.StockMovements.Any() || user.RequestedTransfers.Any() || user.ApprovedTransfers.Any())
        {
            return Conflict(new { Message = "Cannot hard-delete this user because they are referenced in stock movements or transfers. Please deactivate them instead." });
        }

        db.Users.Remove(user);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private static string NormalizePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var p = phone.Trim();
        if (p.StartsWith("0"))
        {
            return "+94" + p.Substring(1);
        }
        return p;
    }
}
