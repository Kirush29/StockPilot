using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Auth;
using StockPilot.API.Entities;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration configuration, IWebHostEnvironment environment) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        if (!environment.IsDevelopment())
        {
            return Unauthorized(new { Message = "Login is currently only supported in the Development environment." });
        }

        var devEmail = configuration["DevAuth:Email"] ?? "dev@stockpilot.local";
        var devPasswordHash = configuration["DevAuth:PasswordHash"];

        if (string.IsNullOrEmpty(devPasswordHash))
        {
            return StatusCode(500, new { Message = "Development authentication is not configured properly." });
        }

        if (request.Email != devEmail)
        {
            return Unauthorized(new { Message = "Invalid credentials." });
        }

        var hasher = new PasswordHasher<User>();
        var result = hasher.VerifyHashedPassword(null!, devPasswordHash, request.Password);

        if (result != PasswordVerificationResult.Success)
        {
            return Unauthorized(new { Message = "Invalid credentials." });
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { Message = "User not found or inactive." });
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtSection = configuration.GetSection("Jwt");
        var key = Encoding.UTF8.GetBytes(jwtSection["SigningKey"]!);

        var expiresAt = DateTime.UtcNow.AddHours(8);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("name", user.FullName),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("role", user.Role)
            ]),
            Expires = expiresAt,
            Issuer = jwtSection["Issuer"],
            Audience = jwtSection["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);

        return Ok(new LoginResponseDto
        {
            AccessToken = tokenHandler.WriteToken(token),
            ExpiresAt = expiresAt,
            User = new UserInfoDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role
            }
        });
    }
}
