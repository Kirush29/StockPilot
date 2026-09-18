using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Orders;

public record UpdateOrderStatusRequest(PurchaseOrderStatus Status, string? Notes);
