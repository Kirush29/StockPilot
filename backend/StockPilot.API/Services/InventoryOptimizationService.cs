using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using StockPilot.API.Data;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;
using System.Text.Json;

namespace StockPilot.API.Services;

public class InventoryOptimizationService(
    AppDbContext db,
    IServiceProvider serviceProvider,
    ILogger<InventoryOptimizationService> logger) : IInventoryOptimizationService
{
    public async Task<List<AiRecommendation>> GetRecommendationsAsync(Guid branchId)
    {
        return await db.AiRecommendations
            .Include(a => a.Product)
            .Include(a => a.Branch)
            .Where(a => a.BranchId == branchId && a.Status == "Pending")
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<AiRecommendation> ActionRecommendationAsync(Guid recommendationId, string action)
    {
        var rec = await db.AiRecommendations.FindAsync(recommendationId);
        if (rec == null) throw new Exception("Recommendation not found");

        if (action.Equals("Approve", StringComparison.OrdinalIgnoreCase))
            rec.Status = "Actioned";
        else if (action.Equals("Reject", StringComparison.OrdinalIgnoreCase))
            rec.Status = "Dismissed";
        else
            throw new Exception("Invalid action");

        rec.ActionedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return rec;
    }

    public async Task<List<AiRecommendation>> GenerateRecommendationsAsync(Guid branchId)
    {
        // 1. Get Low Stock Items for the Branch
        var branchInventory = await db.Inventories
            .Include(i => i.Product)
            .Where(i => i.BranchId == branchId && i.QuantityOnHand <= i.Product.ReorderLevel)
            .ToListAsync();

        var recommendations = new List<AiRecommendation>();
        
        // 2. Get all other branches to see where we might transfer from
        var otherBranchesInventory = await db.Inventories
            .Include(i => i.Branch)
            .Where(i => i.BranchId != branchId && i.QuantityOnHand > i.Product.ReorderLevel)
            .ToListAsync();

        // Check if Semantic Kernel is available
        Kernel? kernel = null;
        IChatCompletionService? chatService = null;
        try
        {
            kernel = serviceProvider.GetService<Kernel>();
            if (kernel != null)
                chatService = kernel.Services.GetService<IChatCompletionService>();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Semantic Kernel not configured or failed to resolve.");
        }

        foreach (var inv in branchInventory)
        {
            // Calculate shortage
            var shortage = inv.Product.ReorderLevel - inv.QuantityOnHand;
            if (shortage <= 0) shortage = 10; // Default buffer

            // Find best branch to transfer from
            var possibleSources = otherBranchesInventory
                .Where(o => o.ProductId == inv.ProductId && o.QuantityOnHand - o.Product.ReorderLevel >= shortage)
                .OrderByDescending(o => o.QuantityOnHand)
                .ToList();

            var source = possibleSources.FirstOrDefault();

            AiRecommendation rec;

            if (chatService != null && source != null)
            {
                // Use AI
                rec = await GenerateAiRecommendationAsync(chatService, inv, source, shortage);
            }
            else
            {
                // Deterministic Fallback
                rec = new AiRecommendation
                {
                    RecommendationId = Guid.NewGuid(),
                    BranchId = branchId,
                    ProductId = inv.ProductId,
                    RecommendationType = source != null ? "Transfer" : "Reorder",
                    SuggestedQuantity = shortage,
                    ConfidenceScore = 0.85m,
                    Reasoning = source != null 
                        ? $"System deterministic check: Recommend transferring {shortage} {inv.Product.Unit} from {source.Branch.Name} due to their excess stock."
                        : $"System deterministic check: No other branches have sufficient stock. Recommend ordering {shortage} {inv.Product.Unit} from supplier."
                };
            }

            db.AiRecommendations.Add(rec);
            recommendations.Add(rec);
        }

        await db.SaveChangesAsync();
        return recommendations;
    }

    private async Task<AiRecommendation> GenerateAiRecommendationAsync(
        IChatCompletionService chatService, 
        Inventory targetInv, 
        Inventory sourceInv, 
        decimal shortage)
    {
        var prompt = $@"
You are an AI Inventory Optimization Agent. 
Analyze the following scenario and provide a recommendation.
Target Branch Needs: {targetInv.Product.Name} (SKU: {targetInv.Product.SKU})
Target Current Stock: {targetInv.QuantityOnHand}
Target Reorder Level: {targetInv.Product.ReorderLevel}
Shortage: {shortage}

Source Branch '{sourceInv.Branch.Name}' has {sourceInv.QuantityOnHand} in stock (Reorder level: {sourceInv.Product.ReorderLevel}).

Formulate a concise reasoning explaining why a stock transfer of {shortage} units from {sourceInv.Branch.Name} is optimal.
Output your response as JSON with the following format:
{{
    ""type"": ""Transfer"",
    ""suggestedQuantity"": {shortage},
    ""reasoning"": ""<your concise reasoning>"",
    ""confidenceScore"": <value between 0.0 and 1.0>
}}
Only return valid JSON. Do not use markdown blocks like ```json.
";
        var rec = new AiRecommendation
        {
            RecommendationId = Guid.NewGuid(),
            BranchId = targetInv.BranchId,
            ProductId = targetInv.ProductId
        };

        try
        {
            var response = await chatService.GetChatMessageContentAsync(prompt);
            var jsonContent = response.Content?.Trim();
            
            if (jsonContent != null && jsonContent.StartsWith("```json"))
            {
                jsonContent = jsonContent.Replace("```json", "").Replace("```", "").Trim();
            }

            var aiResult = JsonSerializer.Deserialize<AiResultDto>(jsonContent ?? "{}");
            
            rec.RecommendationType = aiResult?.Type ?? "Transfer";
            rec.Reasoning = aiResult?.Reasoning ?? "AI recommendation parsed with warnings.";
            rec.SuggestedQuantity = aiResult?.SuggestedQuantity ?? shortage;
            rec.ConfidenceScore = aiResult?.ConfidenceScore ?? 0.90m;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse AI response.");
            // Fallback
            rec.RecommendationType = "Transfer";
            rec.Reasoning = $"AI Analysis failed. Deterministic fallback: Transfer from {sourceInv.Branch.Name}.";
            rec.SuggestedQuantity = shortage;
            rec.ConfidenceScore = 0.50m;
        }

        return rec;
    }

    private class AiResultDto
    {
        public string? Type { get; set; }
        public decimal SuggestedQuantity { get; set; }
        public string? Reasoning { get; set; }
        public decimal ConfidenceScore { get; set; }
    }
}
