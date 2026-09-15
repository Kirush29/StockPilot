namespace StockPilot.API.DTOs.Product;

public class ProductDto
{
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal MinimumStockLevel { get; set; }
    public decimal ReorderLevel { get; set; }
    public decimal MaximumStockLevel { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateProductDto
{
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
}

public class UpdateProductDto
{
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
    public bool IsActive { get; set; }
}
