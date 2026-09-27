using StockPilot.Domain.Enums.Sales;

namespace StockPilot.Application.Sales.DTOs;

public class GenerateForecastRequestDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = "Main Branch";
    public ForecastPeriod Period { get; set; } = ForecastPeriod.Next30Days;
    public int LeadTimeDays { get; set; } = 7;
    public decimal CurrentStockLevel { get; set; } = 0;
}

public class DemandForecastDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public ForecastPeriod Period { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public double ConfidenceScore { get; set; }
    public decimal PredictedTotalDemand { get; set; }
    public decimal AverageDailyDemand { get; set; }
    public DateTime? SuggestedReorderDateUtc { get; set; }
    public decimal RecommendedSafetyStock { get; set; }
    public decimal RecommendedReorderQuantity { get; set; }
    public DemandTrend Trend { get; set; }
    public string? AgentReasoning { get; set; }
    public Guid AgentExecutionId { get; set; }
    public List<DemandForecastItemDto> Items { get; set; } = new();
}

public class DemandForecastItemDto
{
    public DateTime ForecastDateUtc { get; set; }
    public decimal PredictedQuantity { get; set; }
    public decimal LowerBoundQuantity { get; set; }
    public decimal UpperBoundQuantity { get; set; }
}
