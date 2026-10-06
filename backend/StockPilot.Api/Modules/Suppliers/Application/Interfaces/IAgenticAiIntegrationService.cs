using StockPilot.Application.Models;

namespace StockPilot.Application.Interfaces;

public interface IAgenticAiIntegrationService
{
    Task<SupplierEvaluationResponseDto> EvaluateCandidatesAsync(
        Guid productId, 
        IReadOnlyList<SupplierEvaluationCandidateDto> candidates);
}
