namespace StockPilot.API.Entities;

public enum RecommendationType
{
    Transfer,
    Reorder,
    ExpiryAction
}

public enum IssueType
{
    LowStock,
    OutOfStock,
    Overstock,
    ExpiringSoon,
    Expired
}

public enum Priority
{
    Low,
    Medium,
    High,
    Critical
}

public enum RecommendationStatus
{
    PendingReview,
    Approved,
    Rejected,
    TransferCreated,
    Resolved,
    Expired,
    Superseded
}

public class AiRecommendation
{
    public Guid RecommendationId { get; set; }
    
    public RecommendationType RecommendationType { get; set; }
    public IssueType IssueType { get; set; }
    public Priority Priority { get; set; }
    public RecommendationStatus Status { get; set; } = RecommendationStatus.PendingReview;
    
    public Guid ProductId { get; set; }
    public Guid DestinationBranchId { get; set; }
    public Guid? SourceBranchId { get; set; }
    public Guid? BatchId { get; set; }
    public Guid? CreatedTransferId { get; set; }
    
    public decimal? SuggestedQuantity { get; set; }
    public decimal ConfidenceScore { get; set; }
    
    public string Reasoning { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public string? InputSnapshotJson { get; set; }
    public string? RuleVersion { get; set; }
    public string? ModelMetadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedBy { get; set; }

    // Navigation
    public Branch DestinationBranch { get; set; } = null!;
    public Branch? SourceBranch { get; set; }
    public Product Product { get; set; } = null!;
    public Batch? Batch { get; set; }
    public StockTransfer? CreatedTransfer { get; set; }
    public User? ReviewedByUser { get; set; }
}
