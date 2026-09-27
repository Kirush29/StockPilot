namespace StockPilot.Domain.Entities;

public class Inventory
{
    public Guid InventoryId { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }

    public decimal QuantityOnHand { get; set; }
    public decimal ReservedQuantity { get; set; }

    public decimal AvailableQuantity => QuantityOnHand - ReservedQuantity;

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
