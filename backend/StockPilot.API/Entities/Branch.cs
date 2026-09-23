namespace StockPilot.API.Entities;

// SHARED-ENTITY
// Branch is referenced by Inventory, Batch, StockMovement, and StockTransfer.
// If another team member owns Branch/Warehouse, they should extend this entity.
// Do not duplicate this entity in other components.
public class Branch
{
    public Guid BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Inventory> Inventories { get; set; } = [];
    public ICollection<Batch> Batches { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransfer> OutboundTransfers { get; set; } = [];
    public ICollection<StockTransfer> InboundTransfers { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
}
