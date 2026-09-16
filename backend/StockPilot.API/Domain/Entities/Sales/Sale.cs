using StockPilot.Domain.Common;
using StockPilot.Domain.Enums.Sales;

namespace StockPilot.Domain.Entities.Sales;

public class Sale : AuditableEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = "Main Branch";
    public DateTime SaleDateUtc { get; set; } = DateTime.UtcNow;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    
    public string? CustomerReference { get; set; }
    public string? Notes { get; set; }

    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
}
