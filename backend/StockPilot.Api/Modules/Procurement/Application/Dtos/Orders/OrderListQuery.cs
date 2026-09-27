using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Orders;

public record OrderListQuery(PurchaseOrderStatus? Status, int Page = 1, int PageSize = 20);
