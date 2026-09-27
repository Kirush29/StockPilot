using System.ComponentModel.DataAnnotations;

namespace StockPilot.Application.DTOs;

public class UserDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserDto
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z][a-zA-Z0-9._-]*$", ErrorMessage = "Username must start with a letter and contain only letters, numbers, dot, underscore, or hyphen without spaces.")]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    public string EmployeeNumber { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }

    [Required]
    [RegularExpression(@"^(\+94|0)[1-9][0-9]{8}$", ErrorMessage = "Invalid Sri Lankan phone number format.")]
    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class UpdateUserDto
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z][a-zA-Z0-9._-]*$", ErrorMessage = "Username must start with a letter and contain only letters, numbers, dot, underscore, or hyphen without spaces.")]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    public string EmployeeNumber { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }

    [Required]
    [RegularExpression(@"^(\+94|0)[1-9][0-9]{8}$", ErrorMessage = "Invalid Sri Lankan phone number format.")]
    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class UpdateUserStatusDto
{
    public bool IsActive { get; set; }
}

public class ResetPasswordAdminDto
{
    [Required, MinLength(8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.")]
    public string NewPassword { get; set; } = string.Empty;
}
