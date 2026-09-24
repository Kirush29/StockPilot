namespace StockPilot.API.Entities;

public class User
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string ProfileImageUrl { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // e.g. "BusinessOwner","ProcurementManager","BranchManager","StoreEmployee"

    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransfer> RequestedTransfers { get; set; } = [];
    public ICollection<StockTransfer> ApprovedTransfers { get; set; } = [];
}
