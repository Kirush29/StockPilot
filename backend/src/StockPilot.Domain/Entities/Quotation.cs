namespace StockPilot.Domain.Entities;

public class Quotation
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public Guid ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public int DeliveryDays { get; set; }
    public string Status { get; set; } = QuotationStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime ValidUntil { get; set; }
    public DateTime SubmittedAt { get; set; }

    public Supplier Supplier { get; set; } = null!;
}
