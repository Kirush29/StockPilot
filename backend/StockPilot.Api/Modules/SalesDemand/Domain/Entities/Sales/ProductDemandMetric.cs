using StockPilot.Domain.Common;

namespace StockPilot.Domain.Entities.Sales;

public class ProductDemandMetric : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;

    public decimal AverageDailySales30Days { get; set; }
    public decimal AverageDailySales90Days { get; set; }
    public decimal SalesVelocity { get; set; } // items/day
    public decimal StandardDeviationSales { get; set; }

    public int LeadTimeDays { get; set; } = 7;
    public decimal ServiceLevelZ { get; set; } = 1.65m; // 95% service level
    public decimal SafetyStock { get; set; }
    public decimal ReorderPoint { get; set; }
    public decimal EconomicOrderQuantity { get; set; }

    public DateTime LastCalculatedUtc { get; set; } = DateTime.UtcNow;
}
