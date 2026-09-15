namespace StockPilot.API.Entities;

public class Product
{
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal MinimumStockLevel { get; set; }
    public decimal ReorderLevel { get; set; }
    public decimal MaximumStockLevel { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Category Category { get; set; } = null!;
    public ICollection<Inventory> Inventories { get; set; } = [];
    public ICollection<Batch> Batches { get; set; } = [];
    public ICollection<StockMovement> StockMovements { get; set; } = [];
    public ICollection<StockTransferItem> TransferItems { get; set; } = [];
}
