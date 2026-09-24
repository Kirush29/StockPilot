using StockPilot.API.DTOs.Users;

namespace StockPilot.API.Interfaces;

public interface IUserService
{
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto?> GetByIdAsync(Guid userId);
    Task<UserDto> CreateAsync(CreateUserDto dto);
    Task<UserDto> UpdateAsync(Guid userId, UpdateUserDto dto);
    Task ResetPasswordAsync(Guid userId, string newPassword);
}
