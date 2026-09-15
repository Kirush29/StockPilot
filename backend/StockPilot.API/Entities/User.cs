namespace StockPilot.API.Entities;

// AUTH-INTEGRATION-POINT
// This is a minimal stub so Inventory Management can reference PerformedBy/RequestedBy FKs.
// The Authentication component owner must replace this with the full User/Role/Identity implementation.
// Do NOT add password hashing, JWT issuing, or role management here.
public class User
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // e.g. "BusinessOwner","ProcurementManager","BranchManager","StoreEmployee"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransfer> RequestedTransfers { get; set; } = [];
    public ICollection<StockTransfer> ApprovedTransfers { get; set; } = [];
}
