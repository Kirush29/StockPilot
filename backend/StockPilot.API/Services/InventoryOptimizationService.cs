using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using StockPilot.API.Data;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;
using StockPilot.Procurement.Application.Abstractions;
using System.Text.Json;

namespace StockPilot.API.Services;

public class InventoryOptimizationService(
    AppDbContext db,
    IServiceProvider serviceProvider,
    ITransferService transferService,
    ICurrentUserService currentUserService,
    ILogger<InventoryOptimizationService> logger) : IInventoryOptimizationService
{
    public async Task<List<AiRecommendation>> GetRecommendationsAsync(Guid branchId)
    {
        var query = db.AiRecommendations
            .Include(a => a.Product)
            .Include(a => a.DestinationBranch)
            .Include(a => a.SourceBranch)
            .Where(a => a.Status == RecommendationStatus.PendingReview);
            
        if (branchId != Guid.Empty)
            query = query.Where(a => a.DestinationBranchId == branchId);
            
        return await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
    }

    public async Task<AiRecommendation?> GetRecommendationAsync(Guid id)
    {
        return await db.AiRecommendations
            .Include(a => a.Product)
            .Include(a => a.DestinationBranch)
            .Include(a => a.SourceBranch)
            .FirstOrDefaultAsync(a => a.RecommendationId == id);
    }

    public async Task<AiRecommendation> ApproveRecommendationAsync(Guid id)
    {
        var rec = await db.AiRecommendations.FindAsync(id);
        if (rec == null) throw new Exception("Recommendation not found");
        if (rec.Status != RecommendationStatus.PendingReview) throw new Exception("Recommendation is no longer pending.");

        if (rec.RecommendationType != RecommendationType.Transfer)
            throw new Exception("Only Transfer recommendations can be approved currently.");

        var currentUserId = currentUserService.UserId;

        // Transactional approval
        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            // Verify inventories
            var destInv = await db.Inventories
                .Include(i => i.Product)
                .FirstOrDefaultAsync(i => i.BranchId == rec.DestinationBranchId && i.ProductId == rec.ProductId);
            var sourceInv = await db.Inventories
                .Include(i => i.Product)
                .FirstOrDefaultAsync(i => i.BranchId == rec.SourceBranchId && i.ProductId == rec.ProductId);

            if (destInv == null || sourceInv == null)
                throw new Exception("Inventory records missing.");

            var destShortage = destInv.Product.ReorderLevel - destInv.AvailableQuantity;
            if (destShortage <= 0)
                throw new Exception("Destination branch no longer has a shortage.");

            var sourceExcess = sourceInv.AvailableQuantity - sourceInv.Product.ReorderLevel;
            if (sourceExcess < rec.SuggestedQuantity)
                throw new Exception("Source branch no longer has sufficient transferable excess.");

            if (!rec.SourceBranchId.HasValue)
                throw new Exception("Source branch is required to create a transfer.");

            // Create Transfer
            var createDto = new StockPilot.API.DTOs.Transfer.CreateTransferDto
            {
                SourceBranchId = rec.SourceBranchId.Value,
                DestinationBranchId = rec.DestinationBranchId,
                Notes = $"AI Recommendation Approved: {rec.Reasoning}",
                Items = new List<StockPilot.API.DTOs.Transfer.CreateTransferItemDto>
                {
                    new StockPilot.API.DTOs.Transfer.CreateTransferItemDto
                    {
                        ProductId = rec.ProductId,
                        BatchId = rec.BatchId,
                        RequestedQuantity = rec.SuggestedQuantity ?? 0
                    }
                }
            };

            var transfer = await transferService.CreateAsync(createDto, currentUserId);
            
            rec.Status = RecommendationStatus.TransferCreated;
            rec.CreatedTransferId = transfer.StockTransferId;
            rec.ReviewedAt = DateTime.UtcNow;
            rec.ReviewedBy = currentUserId;

            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return rec;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Failed to approve recommendation.");
            throw;
        }
    }

    public async Task<AiRecommendation> RejectRecommendationAsync(Guid id, string reason)
    {
        var rec = await db.AiRecommendations.FindAsync(id);
        if (rec == null) throw new Exception("Recommendation not found");
        if (rec.Status != RecommendationStatus.PendingReview) throw new Exception("Recommendation is no longer pending.");

        rec.Status = RecommendationStatus.Rejected;
        rec.RejectionReason = reason;
        rec.ReviewedAt = DateTime.UtcNow;
        rec.ReviewedBy = currentUserService.UserId;

        await db.SaveChangesAsync();
        return rec;
    }

    public async Task<AiRecommendation> VerifyRecommendationAsync(Guid id)
    {
        var rec = await db.AiRecommendations.FindAsync(id);
        if (rec == null) throw new Exception("Recommendation not found");

        if (rec.Status == RecommendationStatus.TransferCreated)
        {
            var transfer = await db.StockTransfers.FindAsync(rec.CreatedTransferId);
            if (transfer != null && transfer.Status == TransferStatus.Received)
            {
                rec.Status = RecommendationStatus.Resolved;
                await db.SaveChangesAsync();
            }
        }
        return rec;
    }

    public async Task<List<AiRecommendation>> GenerateRecommendationsAsync(Guid branchId)
    {
        var recommendations = new List<AiRecommendation>();

        // 1. Get Inventory for the Branch
        var branchInventory = await db.Inventories
            .Include(i => i.Product)
            .Where(i => i.BranchId == branchId)
            .ToListAsync();

        var otherBranchesInventory = await db.Inventories
            .Include(i => i.Branch)
            .Where(i => i.BranchId != branchId)
            .ToListAsync();

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
            // Deterministic formulas
            var availableQty = inv.AvailableQuantity;
            
            if (availableQty <= inv.Product.ReorderLevel)
            {
                var issueType = availableQty <= 0 ? IssueType.OutOfStock : IssueType.LowStock;
                var shortage = inv.Product.ReorderLevel - availableQty;
                if (shortage <= 0) shortage = 10; 

                // Find valid sources
                var possibleSources = otherBranchesInventory
                    .Where(o => o.ProductId == inv.ProductId && (o.AvailableQuantity - o.Product.ReorderLevel) >= shortage)
                    .OrderByDescending(o => o.AvailableQuantity)
                    .ToList();

                var source = possibleSources.FirstOrDefault();
                var recQty = shortage;
                
                // Prevent duplicate recommendation
                var existing = await db.AiRecommendations
                    .AnyAsync(a => a.DestinationBranchId == branchId && a.ProductId == inv.ProductId && a.Status == RecommendationStatus.PendingReview);
                    
                if (existing) continue;

                AiRecommendation rec = new AiRecommendation
                {
                    RecommendationId = Guid.NewGuid(),
                    DestinationBranchId = branchId,
                    ProductId = inv.ProductId,
                    SourceBranchId = source?.BranchId,
                    RecommendationType = source != null ? RecommendationType.Transfer : RecommendationType.Reorder,
                    IssueType = issueType,
                    SuggestedQuantity = recQty,
                    Priority = issueType == IssueType.OutOfStock ? Priority.Critical : Priority.High,
                    ConfidenceScore = 0.9m,
                    RuleVersion = "Deterministic-v1.0"
                };

                if (chatService != null && source != null)
                {
                    var aiReasoning = await GenerateAiReasoningAsync(chatService, inv, source, recQty);
                    rec.Reasoning = aiReasoning.Reasoning;
                    rec.ConfidenceScore = aiReasoning.Confidence;
                    rec.ModelMetadata = "LLM Generated Explanation";
                }
                else
                {
                    rec.Reasoning = source != null 
                        ? $"System check: Transfer {recQty} {inv.Product.Unit} from {source.Branch.Name}."
                        : $"System check: Reorder {recQty} {inv.Product.Unit}.";
                    rec.ModelMetadata = "Deterministic Fallback";
                }

                db.AiRecommendations.Add(rec);
                recommendations.Add(rec);
            }
        }

        await db.SaveChangesAsync();
        return recommendations;
    }

    private async Task<(string Reasoning, decimal Confidence)> GenerateAiReasoningAsync(
        IChatCompletionService chatService, 
        Inventory targetInv, 
        Inventory sourceInv, 
        decimal shortage)
    {
        var prompt = $@"
You are an AI Inventory Optimization Agent. 
Generate a concise explanation (max 2 sentences) for why transferring {shortage} units of {targetInv.Product.Name} from {sourceInv.Branch.Name} is a good idea.
Output ONLY valid JSON:
{{
    ""reasoning"": ""<explanation>"",
    ""confidenceScore"": <value between 0.7 and 1.0 based on clarity of shortage>
}}
";
        try
        {
            var response = await chatService.GetChatMessageContentAsync(prompt);
            var jsonContent = response.Content?.Trim() ?? "{}";
            
            if (jsonContent.StartsWith("```json"))
                jsonContent = jsonContent.Replace("```json", "").Replace("```", "").Trim();

            using var doc = JsonDocument.Parse(jsonContent);
            var reasoning = doc.RootElement.GetProperty("reasoning").GetString() ?? "Good transfer opportunity.";
            var confidence = doc.RootElement.GetProperty("confidenceScore").GetDecimal();
            return (reasoning, confidence);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse AI response.");
            return ($"AI Analysis failed. Deterministic fallback: Transfer from {sourceInv.Branch.Name}.", 0.50m);
        }
    }
}
