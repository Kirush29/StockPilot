using StockPilot.Domain.Enums;

namespace StockPilot.Domain.Entities;

public class StockMovement
{
    public Guid StockMovementId { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public Guid? BatchId { get; set; }

    public decimal Quantity { get; set; }
    public decimal PreviousQuantity { get; set; }
    public decimal NewQuantity { get; set; }

    public MovementType MovementType { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public string? Reason { get; set; }

    public Guid PerformedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Batch? Batch { get; set; }
    public User PerformedByUser { get; set; } = null!;
}
