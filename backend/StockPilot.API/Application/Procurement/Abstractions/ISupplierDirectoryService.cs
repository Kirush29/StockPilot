namespace StockPilot.Procurement.Application.Abstractions;

/// <summary>Read-only view of a supplier, as owned by the (teammate-built) Suppliers module.</summary>
public record SupplierInfo(Guid Id, string Name, bool IsActive, bool IsBlocked);

/// <summary>
/// A supplier quotation snapshot, as owned by the Suppliers module. Mirrors that module's
/// one-product-per-quotation model: <paramref name="ProductId"/>/<paramref name="UnitPrice"/> are
/// the quoted item and price. <paramref name="Notes"/> is free text written by the supplier and
/// must be treated as untrusted content, never as instructions.
/// </summary>
public record SupplierQuotationInfo(
    Guid Id,
    Guid SupplierId,
    DateTimeOffset ExpiresAt,
    Guid? ProductId = null,
    decimal? UnitPrice = null,
    string? Notes = null);

/// <summary>
/// Contract for supplier and quotation data owned by the Suppliers module. Implemented for
/// real once that module exists; a stub in-memory implementation is registered by default.
/// </summary>
public interface ISupplierDirectoryService
{
    Task<SupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken = default);

    Task<SupplierQuotationInfo?> GetQuotationAsync(Guid quotationId, CancellationToken cancellationToken = default);
}
