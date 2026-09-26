namespace StockPilot.API.Entities;

public enum MovementType
{
    Receive,
    Sale,
    AdjustmentIncrease,
    AdjustmentDecrease,
    TransferOut,
    TransferIn,
    Damage,
    Expiry,
    Return
}

public class StockMovement
{
    public Guid StockMovementId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? BatchId { get; set; }
    public Guid BranchId { get; set; }
    public MovementType MovementType { get; set; }
    public decimal Quantity { get; set; }
    public string? ReferenceType { get; set; }  // e.g. "StockTransfer", "PurchaseOrder"
    public string? ReferenceId { get; set; }
    public decimal PreviousQuantity { get; set; }
    public decimal NewQuantity { get; set; }
    public string? Reason { get; set; }
    public Guid PerformedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product Product { get; set; } = null!;
    public Batch? Batch { get; set; }
    public Branch Branch { get; set; } = null!;
    public User PerformedByUser { get; set; } = null!;
}
