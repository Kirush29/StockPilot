using System.ComponentModel.DataAnnotations;
using StockPilot.API.Entities;

namespace StockPilot.API.DTOs.Batch;

public class BatchDto
{
    public Guid BatchId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime ReceivedDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsExpired { get; set; }
    public bool IsExpiringSoon { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateBatchDto
{
    [Required(ErrorMessage = "Product is required.")]
    public Guid ProductId { get; set; }

    [Required(ErrorMessage = "Branch is required.")]
    public Guid BranchId { get; set; }

    [Required(ErrorMessage = "Batch number is required.")]
    [StringLength(100, ErrorMessage = "Batch number cannot exceed 100 characters.")]
    public string BatchNumber { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public decimal Quantity { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Unit cost must be non-negative.")]
    public decimal UnitCost { get; set; }

    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
}

public class UpdateBatchDto
{
    [Range(0, double.MaxValue, ErrorMessage = "Quantity must be non-negative.")]
    public decimal Quantity { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Unit cost must be non-negative.")]
    public decimal UnitCost { get; set; }

    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public BatchStatus Status { get; set; }
}
