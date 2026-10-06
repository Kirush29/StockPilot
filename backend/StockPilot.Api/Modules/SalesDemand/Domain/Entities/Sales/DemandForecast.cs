using StockPilot.Domain.Common;
using StockPilot.Domain.Enums.Sales;

namespace StockPilot.Domain.Entities.Sales;

public class DemandForecast : AuditableEntity
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;

    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = "Main Branch";

    public ForecastPeriod Period { get; set; } = ForecastPeriod.Next30Days;
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
    public double ConfidenceScore { get; set; } // 0.00 to 1.00

    public decimal PredictedTotalDemand { get; set; }
    public decimal AverageDailyDemand { get; set; }
    public DateTime? SuggestedReorderDateUtc { get; set; }
    public decimal RecommendedSafetyStock { get; set; }
    public decimal RecommendedReorderQuantity { get; set; }
    
    public DemandTrend Trend { get; set; } = DemandTrend.Stable;
    public string? AgentReasoning { get; set; }
    public Guid AgentExecutionId { get; set; } = Guid.NewGuid();

    public ICollection<DemandForecastItem> Items { get; set; } = new List<DemandForecastItem>();
}
