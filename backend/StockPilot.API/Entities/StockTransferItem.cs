namespace StockPilot.API.Entities;

public class StockTransferItem
{
    public Guid StockTransferItemId { get; set; }
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? BatchId { get; set; }
    public decimal RequestedQuantity { get; set; }
    public decimal? ApprovedQuantity { get; set; }
    public decimal? ShippedQuantity { get; set; }
    public decimal? ReceivedQuantity { get; set; }

    // Navigation
    public StockTransfer StockTransfer { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Batch? Batch { get; set; }
}
