using StockPilot.API.Entities;

namespace StockPilot.API.Interfaces;

public interface IInventoryOptimizationService
{
    Task<List<AiRecommendation>> GenerateRecommendationsAsync(Guid branchId);
    Task<List<AiRecommendation>> GetRecommendationsAsync(Guid branchId);
    Task<AiRecommendation?> GetRecommendationAsync(Guid id);
    Task<AiRecommendation> ApproveRecommendationAsync(Guid id);
    Task<AiRecommendation> RejectRecommendationAsync(Guid id, string reason);
    Task<AiRecommendation> VerifyRecommendationAsync(Guid id);
}
