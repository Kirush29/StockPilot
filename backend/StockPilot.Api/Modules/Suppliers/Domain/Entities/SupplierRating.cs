namespace StockPilot.Domain.Entities;

public class SupplierRating
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public decimal Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime RatedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public Supplier Supplier { get; set; } = null!;
}
