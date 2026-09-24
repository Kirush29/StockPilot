namespace StockPilot.API.DTOs.Branch;

public class BranchDto
{
    public Guid BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? ManagerName { get; set; }
    public bool IsActive { get; set; }
}
