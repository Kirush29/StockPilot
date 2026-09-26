using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;

namespace StockPilot.Procurement.Infrastructure.ExternalStubs;

/// <summary>
/// Temporary stand-in for the teammate-built Products module. Replace the registration in
/// <see cref="DependencyInjection"/> with a real HTTP/gRPC client (or shared-DB read service)
/// once that module exists — <see cref="IProductCatalogService"/> is the contract to keep.
/// </summary>
public class InMemoryProductCatalogService : IProductCatalogService
{
    private static readonly Dictionary<Guid, ProductInfo> Products = new()
    {
        [SeedIds.ProductPaper] = new ProductInfo(SeedIds.ProductPaper, "PPR-A4-80G", "Copy Paper A4 80gsm (Ream)", true),
        [SeedIds.ProductInk] = new ProductInfo(SeedIds.ProductInk, "INK-BLK-STD", "Printer Ink Cartridge (Black)", true),
        [SeedIds.ProductChair] = new ProductInfo(SeedIds.ProductChair, "FUR-CHR-OFC", "Office Chair (Ergonomic)", true),
        [SeedIds.ProductToner] = new ProductInfo(SeedIds.ProductToner, "TNR-LSR-BLK", "Laser Printer Toner (Black)", true),
        [SeedIds.ProductStapler] = new ProductInfo(SeedIds.ProductStapler, "STP-HD-01", "Heavy-Duty Stapler", true)
    };

    public Task<ProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken = default) =>
        Task.FromResult(Products.GetValueOrDefault(productId));
}
