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
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public string BatchNumber { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? ReceivedDate { get; set; }
}

public class UpdateBatchDto
{
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? ManufacturingDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public BatchStatus Status { get; set; }
}
