using StockPilot.Procurement.Application.Abstractions;

namespace StockPilot.Procurement.Tests.TestHelpers;

public class FakeCurrentUserService(Guid userId, params string[] roles) : ICurrentUserService
{
    public Guid UserId { get; } = userId;

    public IReadOnlyCollection<string> Roles { get; } = roles;

    public bool IsInRole(string role) => Roles.Contains(role);
}

public class FakeProductCatalogService : IProductCatalogService
{
    private readonly Dictionary<Guid, ProductInfo> _products = new();

    public FakeProductCatalogService WithProduct(Guid id, bool isActive = true)
    {
        _products[id] = new ProductInfo(id, $"SKU-{id:N}"[..10], $"Product {id}", isActive);
        return this;
    }

    public Task<ProductInfo?> GetProductAsync(Guid productId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_products.GetValueOrDefault(productId));
}

public class FakeSupplierDirectoryService : ISupplierDirectoryService
{
    private readonly Dictionary<Guid, SupplierInfo> _suppliers = new();
    private readonly Dictionary<Guid, SupplierQuotationInfo> _quotations = new();

    public FakeSupplierDirectoryService WithSupplier(Guid id, bool isActive = true, bool isBlocked = false)
    {
        _suppliers[id] = new SupplierInfo(id, $"Supplier {id}", isActive, isBlocked);
        return this;
    }

    public FakeSupplierDirectoryService WithQuotation(
        Guid id, Guid supplierId, DateTimeOffset expiresAt, Guid? productId = null, decimal? unitPrice = null, string? notes = null)
    {
        _quotations[id] = new SupplierQuotationInfo(id, supplierId, expiresAt, productId, unitPrice, notes);
        return this;
    }

    public Task<SupplierInfo?> GetSupplierAsync(Guid supplierId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_suppliers.GetValueOrDefault(supplierId));

    public Task<SupplierQuotationInfo?> GetQuotationAsync(Guid quotationId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_quotations.GetValueOrDefault(quotationId));
}

public class FakeBranchDirectoryService : IBranchDirectoryService
{
    private readonly Dictionary<Guid, BranchInfo> _branches = new();

    public FakeBranchDirectoryService WithBranch(Guid id, bool isActive = true)
    {
        _branches[id] = new BranchInfo(id, $"Branch {id}", isActive);
        return this;
    }

    public Task<BranchInfo?> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_branches.GetValueOrDefault(branchId));
}

public class FakeInventoryStockUpdater : IInventoryStockUpdater
{
    public List<(Guid BranchId, Guid ProductId, int Quantity, Guid PurchaseOrderId)> Calls { get; } = [];

    public Task NotifyStockReceivedAsync(Guid branchId, Guid productId, int quantityReceived, Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        Calls.Add((branchId, productId, quantityReceived, purchaseOrderId));
        return Task.CompletedTask;
    }
}
