using System.ComponentModel.DataAnnotations;

namespace StockPilot.Application.DTOs.Branch;

public class UpdateBranchDto
{
    [Required(ErrorMessage = "Branch name is required.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Branch name must be between 3 and 100 characters.")]
    [RegularExpression(@"^[a-zA-Z0-9\s\'\-&]+$", ErrorMessage = "Branch name contains invalid characters. Use letters, numbers, spaces, and hyphens.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Branch address is required.")]
    [StringLength(200, MinimumLength = 5, ErrorMessage = "Address must be between 5 and 200 characters.")]
    public string Address { get; set; } = string.Empty;

    [Required(ErrorMessage = "City is required.")]
    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string City { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^(?:\+94|0)7\d{8}$", ErrorMessage = "Please enter a valid Sri Lankan mobile number (e.g., 0771234567 or +94771234567).")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [MaxLength(200, ErrorMessage = "Email address cannot exceed 200 characters.")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address (e.g., branch@stockpilot.com).")]
    public string Email { get; set; } = string.Empty;

    [MaxLength(200, ErrorMessage = "Manager name cannot exceed 200 characters.")]
    public string? ManagerName { get; set; }

    public bool IsActive { get; set; }
}
