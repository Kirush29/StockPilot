using System.ComponentModel.DataAnnotations;

namespace StockPilot.API.DTOs.Branch;

public class CreateBranchDto
{
    [Required]
    [MaxLength(20)]
    public string BranchCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    [MaxLength(200)]
    [EmailAddress]
    public string? Email { get; set; }

    [MaxLength(200)]
    public string? ManagerName { get; set; }

    public bool IsActive { get; set; } = true;
}
