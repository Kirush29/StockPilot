namespace StockPilot.Domain.Entities;

public class Supplier
{
    public Guid Id { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<SupplierRating> SupplierRatings { get; set; } = new List<SupplierRating>();
    public ICollection<Quotation> Quotations { get; set; } = new List<Quotation>();
}
