using StockPilot.Domain.Common;

namespace StockPilot.Domain.Entities.Sales;

public class DemandForecastItem : BaseEntity
{
    public Guid DemandForecastId { get; set; }
    public DemandForecast DemandForecast { get; set; } = null!;

    public DateTime ForecastDateUtc { get; set; }
    public decimal PredictedQuantity { get; set; }
    public decimal LowerBoundQuantity { get; set; }
    public decimal UpperBoundQuantity { get; set; }
}
