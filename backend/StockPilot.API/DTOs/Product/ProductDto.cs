using System.ComponentModel.DataAnnotations;

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
    [Required(ErrorMessage = "SKU is required.")]
    [StringLength(50, ErrorMessage = "SKU cannot exceed 50 characters.")]
    public string SKU { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Barcode cannot exceed 100 characters.")]
    public string? Barcode { get; set; }

    [Required(ErrorMessage = "Product name is required.")]
    [StringLength(200, ErrorMessage = "Product name cannot exceed 200 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    public Guid CategoryId { get; set; }

    [Required(ErrorMessage = "Unit is required.")]
    [StringLength(50, ErrorMessage = "Unit cannot exceed 50 characters.")]
    public string Unit { get; set; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "Minimum stock level must be non-negative.")]
    public decimal MinimumStockLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Reorder level must be non-negative.")]
    public decimal ReorderLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Maximum stock level must be non-negative.")]
    public decimal MaximumStockLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Cost price must be non-negative.")]
    public decimal CostPrice { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Selling price must be non-negative.")]
    public decimal SellingPrice { get; set; }
}

public class UpdateProductDto
{
    [Required(ErrorMessage = "SKU is required.")]
    [StringLength(50, ErrorMessage = "SKU cannot exceed 50 characters.")]
    public string SKU { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Barcode cannot exceed 100 characters.")]
    public string? Barcode { get; set; }

    [Required(ErrorMessage = "Product name is required.")]
    [StringLength(200, ErrorMessage = "Product name cannot exceed 200 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    public Guid CategoryId { get; set; }

    [Required(ErrorMessage = "Unit is required.")]
    [StringLength(50, ErrorMessage = "Unit cannot exceed 50 characters.")]
    public string Unit { get; set; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "Minimum stock level must be non-negative.")]
    public decimal MinimumStockLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Reorder level must be non-negative.")]
    public decimal ReorderLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Maximum stock level must be non-negative.")]
    public decimal MaximumStockLevel { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Cost price must be non-negative.")]
    public decimal CostPrice { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Selling price must be non-negative.")]
    public decimal SellingPrice { get; set; }

    public bool IsActive { get; set; }
}
