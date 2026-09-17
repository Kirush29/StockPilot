namespace StockPilot.API.Entities;

public enum TransferStatus
{
    Draft,
    Requested,
    Approved,
    Rejected,
    InTransit,
    Received,
    Cancelled
}

public class StockTransfer
{
    public Guid StockTransferId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceBranchId { get; set; }
    public Guid DestinationBranchId { get; set; }
    public TransferStatus Status { get; set; } = TransferStatus.Draft;
    public Guid RequestedBy { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime? RejectedAt { get; set; }

    // Navigation
    public Branch SourceBranch { get; set; } = null!;
    public Branch DestinationBranch { get; set; } = null!;
    public User RequestedByUser { get; set; } = null!;
    public User? ApprovedByUser { get; set; }
    public ICollection<StockTransferItem> Items { get; set; } = [];
}
