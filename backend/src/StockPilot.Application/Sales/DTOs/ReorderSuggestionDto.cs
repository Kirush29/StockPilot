namespace StockPilot.Application.Sales.DTOs;

public class ReorderSuggestionDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    
    public decimal CurrentStock { get; set; }
    public decimal AverageDailySales { get; set; }
    public int LeadTimeDays { get; set; }
    public decimal SafetyStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal RecommendedOrderQuantity { get; set; }
    
    public bool NeedsReorder { get; set; }
    public int DaysOfSupplyRemaining { get; set; }
    public string UrgencyLevel { get; set; } = "Normal"; // Normal, Warning, Critical
}
