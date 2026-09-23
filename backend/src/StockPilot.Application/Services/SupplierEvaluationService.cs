using StockPilot.Application.Interfaces;
using StockPilot.Application.Models;
using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public class SupplierEvaluationService : ISupplierEvaluationService
{
    private readonly IQuotationRepository _quotationRepository;
    private readonly ISupplierRepository _supplierRepository;
    private readonly IProductRepository _productRepository;
    private readonly IAgenticAiIntegrationService _aiIntegrationService;

    public SupplierEvaluationService(
        IQuotationRepository quotationRepository,
        ISupplierRepository supplierRepository,
        IProductRepository productRepository,
        IAgenticAiIntegrationService aiIntegrationService)
    {
        _quotationRepository = quotationRepository;
        _supplierRepository = supplierRepository;
        _productRepository = productRepository;
        _aiIntegrationService = aiIntegrationService;
    }

    public async Task<SupplierEvaluationResponseDto> EvaluateQuotationsAsync(Guid productId)
    {
        var product = await _productRepository.GetByIdAsync(productId);
        if (product == null)
        {
            throw new KeyNotFoundException("Product not found.");
        }

        var quotations = await _quotationRepository.GetByProductIdAsync(productId);
        if (!quotations.Any())
        {
            return new SupplierEvaluationResponseDto(
                new List<SupplierEvaluationResultDto>(),
                new List<SupplierEvaluationCandidateDto>(),
                "NoEligibleSupplier",
                true
            );
        }

        var results = new List<SupplierEvaluationResultDto>();

        foreach (var quotation in quotations)
        {
            var supplier = await _supplierRepository.GetByIdAsync(quotation.SupplierId);
            if (supplier == null)
            {
                throw new KeyNotFoundException("Supplier not found.");
            }

            decimal? averageRating = supplier.Rating > 0 ? supplier.Rating : null;

            bool isEligible;
            string eligibilityReason;

            if (!supplier.IsActive)
            {
                isEligible = false;
                eligibilityReason = "Supplier is not active.";
            }
            else if (quotation.Status != QuotationStatus.Pending)
            {
                isEligible = false;
                eligibilityReason = $"Quotation status is {quotation.Status}, not Pending.";
            }
            else if (quotation.ValidUntil < DateTime.UtcNow)
            {
                isEligible = false;
                eligibilityReason = "Quotation has expired.";
            }
            else
            {
                isEligible = true;
                eligibilityReason = "Quotation is eligible.";
            }

            results.Add(new SupplierEvaluationResultDto(
                supplier.Id,
                quotation.Id,
                quotation.QuotationReference,
                quotation.UnitPrice,
                quotation.DeliveryDays,
                averageRating,
                quotation.Status,
                isEligible,
                eligibilityReason
            ));
        }

        var eligibleResults = results.Where(r => r.Eligibility).ToList();

        if (eligibleResults.Any())
        {
            var lowestPrice = eligibleResults.Min(r => r.UnitPrice);
            var fastestDelivery = eligibleResults.Min(r => r.DeliveryDays);
            var highestRating = eligibleResults.Max(r => r.SupplierRating ?? 0m);

            var scoredResults = new List<SupplierEvaluationResultDto>();

            foreach (var result in results)
            {
                if (!result.Eligibility)
                {
                    scoredResults.Add(result);
                    continue;
                }

                decimal priceScore = result.UnitPrice > 0 ? (lowestPrice / result.UnitPrice) * 100m : 100m;
                decimal deliveryScore = result.DeliveryDays > 0 ? ((decimal)fastestDelivery / result.DeliveryDays) * 100m : 100m;
                decimal ratingScore = highestRating > 0 ? ((result.SupplierRating ?? 0m) / highestRating) * 100m : 0m;
                
                decimal overallScore = (priceScore * 0.50m) + (deliveryScore * 0.30m) + (ratingScore * 0.20m);

                scoredResults.Add(result with
                {
                    PriceScore = priceScore,
                    DeliveryScore = deliveryScore,
                    RatingScore = ratingScore,
                    OverallScore = overallScore
                });
            }

            var candidates = scoredResults
                .Where(r => r.Eligibility)
                .Select(r => new SupplierEvaluationCandidateDto(
                    r.SupplierId,
                    r.QuotationId,
                    r.QuotationReference,
                    r.UnitPrice,
                    r.DeliveryDays,
                    r.SupplierRating,
                    r.PriceScore!.Value,
                    r.DeliveryScore!.Value,
                    r.RatingScore!.Value,
                    r.OverallScore!.Value
                )).ToList();

            var aiResponse = await _aiIntegrationService.EvaluateCandidatesAsync(productId, candidates);

            return new SupplierEvaluationResponseDto(
                scoredResults,
                candidates,
                aiResponse.DecisionStatus,
                true // Enforce human approval
            );
        }

        return new SupplierEvaluationResponseDto(
            results,
            new List<SupplierEvaluationCandidateDto>(),
            "NoEligibleSupplier",
            true
        );
    }
}
