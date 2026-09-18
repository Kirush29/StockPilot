namespace StockPilot.API.Entities;

public class AiRecommendation
{
    public Guid RecommendationId { get; set; }
    public Guid BranchId { get; set; }
    public Guid ProductId { get; set; }
    
    public string RecommendationType { get; set; } = string.Empty; // e.g., "Transfer", "Reorder"
    public string Reasoning { get; set; } = string.Empty;
    
    public decimal? SuggestedQuantity { get; set; }
    public decimal ConfidenceScore { get; set; } // 0.0 to 1.0
    
    public string Status { get; set; } = "Pending"; // Pending, Actioned, Dismissed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ActionedAt { get; set; }

    // Navigation
    public Branch? Branch { get; set; }
    public Product? Product { get; set; }
}
