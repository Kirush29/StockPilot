namespace StockPilot.API.Entities;

public enum BatchStatus
{
    Active,
    Expired,
    Damaged,
    Depleted
}

public class Batch
{
    public Guid BatchId { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;
    public BatchStatus Status { get; set; } = BatchStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransferItem> TransferItems { get; set; } = [];
}
