namespace StockPilot.Procurement.Application.Abstractions;

/// <summary>Read-only view of a product, as owned by the (teammate-built) Products module.</summary>
public record ProductInfo(Guid Id, string Sku, string Name, bool IsActive);

/// <summary>
/// Contract for looking up product data owned by the Products module. Implemented for real
/// once that module exists (HTTP client, gRPC client, or shared-DB read); a stub in-memory
/// implementation is registered by default so this project compiles and runs standalone.
/// </summary>
public interface IProductCatalogService
{
    Task<ProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken = default);
}
