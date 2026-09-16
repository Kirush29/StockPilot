using StockPilot.API.Entities;

namespace StockPilot.API.DTOs.StockMovement;

public class StockMovementDto
{
    public Guid StockMovementId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public decimal PreviousQuantity { get; set; }
    public decimal NewQuantity { get; set; }
    public string? Reason { get; set; }
    public Guid PerformedBy { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateAdjustmentDto
{
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public Guid? BatchId { get; set; }
    public MovementType MovementType { get; set; }   // AdjustmentIncrease | AdjustmentDecrease | Damage | Return
    public decimal Quantity { get; set; }
    public string? Reason { get; set; }
}
