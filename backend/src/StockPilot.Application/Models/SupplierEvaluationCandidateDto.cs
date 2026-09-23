namespace StockPilot.Application.Models;

public record SupplierEvaluationCandidateDto(
    Guid SupplierId,
    Guid QuotationId,
    decimal UnitPrice,
    int DeliveryDays,
    decimal? SupplierRating,
    decimal PriceScore,
    decimal DeliveryScore,
    decimal RatingScore,
    decimal OverallScore
);
