namespace StockPilot.Application.Models;

public record SupplierEvaluationResultDto(
    Guid SupplierId,
    Guid QuotationId,
    string QuotationReference,
    decimal UnitPrice,
    int DeliveryDays,
    decimal? SupplierRating,
    string Status,
    bool Eligibility,
    string EligibilityReason,
    decimal? PriceScore = null,
    decimal? DeliveryScore = null,
    decimal? RatingScore = null,
    decimal? OverallScore = null
);
