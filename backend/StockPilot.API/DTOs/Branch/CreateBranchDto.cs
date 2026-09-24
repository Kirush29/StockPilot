using System.ComponentModel.DataAnnotations;

namespace StockPilot.API.DTOs.Branch;

public class CreateBranchDto
{
    [Required]
    [StringLength(20, MinimumLength = 2)]
    [RegularExpression(@"^[A-Z0-9]+(?:-[A-Z0-9]+)*$", ErrorMessage = "Branch code must consist of uppercase letters, numbers, and single hyphens.")]
    public string BranchCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z0-9\s\'\-&]+$", ErrorMessage = "Branch name contains invalid characters.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 5)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^(?:\+94|0)7\d{8}$", ErrorMessage = "Invalid Sri Lankan phone number.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ManagerName { get; set; }

    public bool IsActive { get; set; } = true;
}
