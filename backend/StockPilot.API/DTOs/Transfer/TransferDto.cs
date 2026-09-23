using System.ComponentModel.DataAnnotations;

namespace StockPilot.API.DTOs.Transfer;

public class TransferItemDto
{
    public Guid StockTransferItemId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal RequestedQuantity { get; set; }
    public decimal? ApprovedQuantity { get; set; }
    public decimal? ShippedQuantity { get; set; }
    public decimal? ReceivedQuantity { get; set; }
}

public class TransferDto
{
    public Guid StockTransferId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceBranchId { get; set; }
    public string SourceBranchName { get; set; } = string.Empty;
    public Guid DestinationBranchId { get; set; }
    public string DestinationBranchName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid RequestedBy { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime RequestedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime? RejectedAt { get; set; }
    public List<TransferItemDto> Items { get; set; } = [];
}

public class CreateTransferItemDto
{
    [Required(ErrorMessage = "Product is required.")]
    public Guid ProductId { get; set; }
    public Guid? BatchId { get; set; }

    [Range(0.0001, double.MaxValue, ErrorMessage = "Requested quantity must be greater than zero.")]
    public decimal RequestedQuantity { get; set; }
}

public class CreateTransferDto
{
    [Required(ErrorMessage = "Source branch is required.")]
    public Guid SourceBranchId { get; set; }

    [Required(ErrorMessage = "Destination branch is required.")]
    public Guid DestinationBranchId { get; set; }
    public string? Notes { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "At least one item is required for the transfer.")]
    public List<CreateTransferItemDto> Items { get; set; } = [];
}

public class ApproveTransferDto
{
    public List<ApproveTransferItemDto> Items { get; set; } = [];
}

public class ApproveTransferItemDto
{
    public Guid StockTransferItemId { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Approved quantity cannot be negative.")]
    public decimal ApprovedQuantity { get; set; }
}

public class RejectTransferDto
{
    [Required(ErrorMessage = "Rejection reason is required.")]
    public string RejectionReason { get; set; } = string.Empty;
}

public class ReceiveTransferDto
{
    public List<ReceiveTransferItemDto> Items { get; set; } = [];
}

public class ReceiveTransferItemDto
{
    public Guid StockTransferItemId { get; set; }
    public decimal ReceivedQuantity { get; set; }
}
