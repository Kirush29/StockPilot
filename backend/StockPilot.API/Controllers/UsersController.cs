using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Users;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "BusinessOwner")]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        var users = await userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id)
    {
        var user = await userService.GetByIdAsync(id);
        if (user == null) return Problem(statusCode: 404, title: "User not found.");
        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserDto request, [FromServices] AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Username == request.Username))
        {
            ModelState.AddModelError("Username", "This username is already in use.");
        }
        if (await db.Users.AnyAsync(u => u.Email == request.Email))
        {
            ModelState.AddModelError("Email", "This email address is already registered.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var user = await userService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = user.UserId }, user);
        }
        catch (Exception ex)
        {
            return Problem(statusCode: 500, title: "Failed to create user.", detail: ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserDto request)
    {
        try
        {
            var user = await userService.UpdateAsync(id, request);
            return Ok(user);
        }
        catch (Exception ex)
        {
            if (ex.Message == "User not found")
            {
                return Problem(statusCode: 404, title: "User not found.");
            }
            return Problem(statusCode: 500, title: "Failed to update user.", detail: ex.Message);
        }
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] string newPassword)
    {
        try
        {
            await userService.ResetPasswordAsync(id, newPassword);
            return NoContent();
        }
        catch (Exception ex)
        {
            if (ex.Message == "User not found")
            {
                return Problem(statusCode: 404, title: "User not found.");
            }
            return Problem(statusCode: 500, title: "Failed to reset password.", detail: ex.Message);
        }
    }
}
