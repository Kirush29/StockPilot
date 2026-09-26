using StockPilot.Domain.Enums.Sales;

namespace StockPilot.Application.Sales.DTOs;

public class CreateSaleDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = "Main Branch";
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? CustomerReference { get; set; }
    public string? Notes { get; set; }
    public List<CreateSaleItemDto> Items { get; set; } = new();
}

public class CreateSaleItemDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercent { get; set; }
}
