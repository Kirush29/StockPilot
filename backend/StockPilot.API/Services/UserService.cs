using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Users;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class UserService(AppDbContext db) : IUserService
{
    public async Task<List<UserDto>> GetAllAsync()
    {
        return await db.Users
            .Include(u => u.Branch)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                Username = u.Username,
                Email = u.Email,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                Role = u.Role,
                IsActive = u.IsActive,
                BranchId = u.BranchId,
                BranchName = u.Branch != null ? u.Branch.Name : null,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<UserDto?> GetByIdAsync(Guid userId)
    {
        var u = await db.Users
            .Include(u => u.Branch)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (u == null) return null;

        return new UserDto
        {
            UserId = u.UserId,
            Username = u.Username,
            Email = u.Email,
            FullName = u.FullName,
            PhoneNumber = u.PhoneNumber,
            Role = u.Role,
            IsActive = u.IsActive,
            BranchId = u.BranchId,
            BranchName = u.Branch != null ? u.Branch.Name : null,
            CreatedAt = u.CreatedAt
        };
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto)
    {
        var exists = await db.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email);
        if (exists)
            throw new Exception("Username or Email already exists.");

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Username = dto.Username,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            Role = dto.Role,
            BranchId = dto.BranchId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            MustChangePassword = true
        };

        var hasher = new PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, dto.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return await GetByIdAsync(user.UserId) ?? throw new Exception("User creation failed");
    }

    public async Task<UserDto> UpdateAsync(Guid userId, UpdateUserDto dto)
    {
        var user = await db.Users.FindAsync(userId) 
            ?? throw new Exception("User not found");

        if (dto.FullName != null) user.FullName = dto.FullName;
        if (dto.PhoneNumber != null) user.PhoneNumber = dto.PhoneNumber;
        if (dto.Role != null) user.Role = dto.Role;
        if (dto.BranchId != null) user.BranchId = dto.BranchId;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

        await db.SaveChangesAsync();

        return await GetByIdAsync(user.UserId) ?? throw new Exception("User update failed");
    }

    public async Task ResetPasswordAsync(Guid userId, string newPassword)
    {
        var user = await db.Users.FindAsync(userId) 
            ?? throw new Exception("User not found");

        var hasher = new PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, newPassword);
        user.MustChangePassword = true;

        await db.SaveChangesAsync();
    }
}
