using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Domain.Entities;

/// <summary>Audit trail entry for every <see cref="PurchaseOrder"/> status transition.</summary>
public class PurchaseOrderStatusHistory
{
    public Guid Id { get; set; }

    public Guid PurchaseOrderId { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }

    public PurchaseOrderStatus? FromStatus { get; set; }

    public PurchaseOrderStatus ToStatus { get; set; }

    public Guid ChangedByUserId { get; set; }

    public DateTimeOffset ChangedAt { get; set; }

    public string? Notes { get; set; }

    /// <summary>Audit column. Always equal to <see cref="UpdatedAt"/> since history entries are immutable.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Audit column. Always equal to <see cref="CreatedAt"/> since history entries are immutable.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
