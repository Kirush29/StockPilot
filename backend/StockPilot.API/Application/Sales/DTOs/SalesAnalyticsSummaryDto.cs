namespace StockPilot.Application.Sales.DTOs;

public class SalesAnalyticsSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalTransactions { get; set; }
    public decimal TotalUnitsSold { get; set; }
    public decimal AverageOrderValue { get; set; }
    
    public List<TopSellingProductDto> TopSellingProducts { get; set; } = new();
    public List<TopSellingProductDto> SlowMovingProducts { get; set; } = new();
    public List<DailySalesTrendDto> DailyTrends { get; set; } = new();
    public List<CategorySalesShareDto> CategoryShares { get; set; } = new();
    public List<BranchSalesComparisonDto> BranchComparisons { get; set; } = new();
    public List<DayOfWeekPatternDto> DayOfWeekPatterns { get; set; } = new();
    public CustomerBehaviorSummaryDto CustomerBehavior { get; set; } = new();
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
    public bool IsSpike { get; set; }
}

public class CategorySalesShareDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal UnitsSold { get; set; }
    public double Percentage { get; set; }
}

public class BranchSalesComparisonDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal UnitsSold { get; set; }
    public int OrderCount { get; set; }
    public double PercentageOfTotal { get; set; }
}

public class DayOfWeekPatternDto
{
    public string DayName { get; set; } = string.Empty;
    public int DayIndex { get; set; } // 0 = Sunday, 1 = Monday, etc.
    public decimal AverageQuantity { get; set; }
    public decimal AverageRevenue { get; set; }
    public int TotalDaysObserved { get; set; }
}

public class CustomerBehaviorSummaryDto
{
    public List<TopCustomerDto> TopCustomers { get; set; } = new();
    public double RepeatCustomerRate { get; set; }
    public int TotalUniqueCustomers { get; set; }
    public List<CoPurchasedItemDto> ProductsBoughtTogether { get; set; } = new();
}

public class TopCustomerDto
{
    public string CustomerReference { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal TotalSpend { get; set; }
    public DateTime LastPurchaseDateUtc { get; set; }
}

public class CoPurchasedItemDto
{
    public string PrimaryProductSku { get; set; } = string.Empty;
    public string PrimaryProductName { get; set; } = string.Empty;
    public string SecondaryProductSku { get; set; } = string.Empty;
    public string SecondaryProductName { get; set; } = string.Empty;
    public int CoOccurrenceCount { get; set; }
}
