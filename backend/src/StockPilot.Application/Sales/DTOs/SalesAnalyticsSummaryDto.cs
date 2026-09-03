namespace StockPilot.Application.Sales.DTOs;

public class SalesAnalyticsSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalTransactions { get; set; }
    public decimal TotalUnitsSold { get; set; }
    public decimal AverageOrderValue { get; set; }
    
    public List<TopSellingProductDto> TopSellingProducts { get; set; } = new();
    public List<DailySalesTrendDto> DailyTrends { get; set; } = new();
    public List<CategorySalesShareDto> CategoryShares { get; set; } = new();
}

public class TopSellingProductDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitsSold { get; set; }
    public decimal TotalRevenue { get; set; }
    public string VelocityCategory { get; set; } = "Fast"; // Fast, Medium, Slow
}

public class DailySalesTrendDto
{
    public DateTime Date { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalQuantity { get; set; }
    public int OrderCount { get; set; }
}

public class CategorySalesShareDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public double Percentage { get; set; }
}
