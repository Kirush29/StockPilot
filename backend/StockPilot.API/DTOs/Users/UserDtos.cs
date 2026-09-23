using System.ComponentModel.DataAnnotations;

namespace StockPilot.API.DTOs.Users;

public class CreateUserDto
{
    [Required(ErrorMessage = "Username is required.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = "Username can only contain letters, numbers, dots, dashes, and underscores.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(200, ErrorMessage = "Full name cannot exceed 200 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
        ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Role is required.")]
    public string Role { get; set; } = string.Empty;

    [RegularExpression(@"^(?:\+94|0)7\d{8}$", ErrorMessage = "Invalid Sri Lankan phone number.")]
    public string PhoneNumber { get; set; } = string.Empty;

    public Guid? BranchId { get; set; }
}

public class UpdateUserDto
{
    [StringLength(200, ErrorMessage = "Full name cannot exceed 200 characters.")]
    public string? FullName { get; set; }

    [RegularExpression(@"^(?:\+94|0)7\d{8}$", ErrorMessage = "Invalid Sri Lankan phone number.")]
    public string? PhoneNumber { get; set; }

    public string? Role { get; set; }
    public Guid? BranchId { get; set; }
    public bool? IsActive { get; set; }
}

public class UserDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public DateTime CreatedAt { get; set; }
}
