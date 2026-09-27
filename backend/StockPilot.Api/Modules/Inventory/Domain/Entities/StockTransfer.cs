using StockPilot.Domain.Enums;

namespace StockPilot.Domain.Entities;

public class StockTransfer
{
    public Guid StockTransferId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceBranchId { get; set; }
    public Guid DestinationBranchId { get; set; }

    public TransferStatus Status { get; set; } = TransferStatus.Requested;
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }

    public Guid RequestedBy { get; set; }
    public Guid? ApprovedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
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
