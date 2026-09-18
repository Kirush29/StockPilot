using StockPilot.API.Entities;

namespace StockPilot.API.Interfaces;

public interface IInventoryOptimizationService
{
    Task<List<AiRecommendation>> GenerateRecommendationsAsync(Guid branchId);
    Task<List<AiRecommendation>> GetRecommendationsAsync(Guid branchId);
    Task<AiRecommendation> ActionRecommendationAsync(Guid recommendationId, string action);
}
