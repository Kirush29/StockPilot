using StockPilot.Domain.Enums;

namespace StockPilot.Domain.Entities;

public class Batch
{
    public Guid BatchId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }

    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ReceivedDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public BatchStatus Status { get; set; } = BatchStatus.Active;

    // Navigation
    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransferItem> TransferItems { get; set; } = [];
}
