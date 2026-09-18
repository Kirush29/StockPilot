using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Orders;

public record PurchaseOrderLineItemResponse(Guid Id, Guid ProductId, int Quantity, decimal UnitPrice, decimal LineTotal);

public record PurchaseOrderStatusHistoryResponse(
    PurchaseOrderStatus? FromStatus,
    PurchaseOrderStatus ToStatus,
    Guid ChangedByUserId,
    DateTimeOffset ChangedAt,
    string? Notes);

public record PurchaseOrderSummaryResponse(
    Guid Id,
    Guid ProposalId,
    Guid SupplierId,
    string OrderNumber,
    PurchaseOrderStatus Status,
    decimal TotalCost,
    DateOnly? ExpectedDeliveryDate,
    DateTimeOffset CreatedAt);

public record PurchaseOrderDetailResponse(
    Guid Id,
    Guid ProposalId,
    Guid SupplierId,
    string OrderNumber,
    PurchaseOrderStatus Status,
    decimal TotalCost,
    DateOnly? ExpectedDeliveryDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<PurchaseOrderLineItemResponse> LineItems,
    IReadOnlyList<PurchaseOrderStatusHistoryResponse> StatusHistory);
