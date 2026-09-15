namespace StockPilot.API.Entities;

public class Inventory
{
    public Guid InventoryId { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal ReservedQuantity { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Computed — not stored in DB
    public decimal AvailableQuantity => QuantityOnHand - ReservedQuantity;

    // Navigation
    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
