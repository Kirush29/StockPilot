namespace StockPilot.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Used by Supplier module
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Inventory properties
    public string? Barcode { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal MinimumStockLevel { get; set; }
    public decimal ReorderLevel { get; set; }
    public decimal MaximumStockLevel { get; set; }

    public Guid? CategoryId { get; set; }
    public Category? CategoryNavigation { get; set; }

    public ICollection<Inventory> Inventories { get; set; } = [];
    public ICollection<Batch> Batches { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransferItem> TransferItems { get; set; } = [];
}
