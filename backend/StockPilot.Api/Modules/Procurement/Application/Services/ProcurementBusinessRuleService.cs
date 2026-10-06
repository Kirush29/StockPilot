using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Dtos.Rules;
using StockPilot.Procurement.Application.Repositories;

namespace StockPilot.Procurement.Application.Services;

public class ProcurementBusinessRuleService(
    IProposalRepository proposals,
    IProductCatalogService products,
    ISupplierDirectoryService suppliers,
    IBranchDirectoryService branches) : IProcurementBusinessRuleService
{
    public const string BranchActive = nameof(BranchActive);
    public const string SupplierNotBlocked = nameof(SupplierNotBlocked);
    public const string QuotationValid = nameof(QuotationValid);
    public const string UnitPriceMatchesQuotation = nameof(UnitPriceMatchesQuotation);
    public const string ProductActive = nameof(ProductActive);
    public const string QuantityPositive = nameof(QuantityPositive);
    public const string NoDuplicateOpenOrder = nameof(NoDuplicateOpenOrder);

    public async Task<BusinessRuleCheckResponse> EvaluateAsync(BusinessRuleCheckRequest request, CancellationToken cancellationToken = default)
    {
        var results = new List<BusinessRuleResult>();

        var branch = await branches.GetBranchAsync(request.BranchId, cancellationToken);
        results.Add(branch switch
        {
            null => new BusinessRuleResult(BranchActive, false, "Branch not found."),
            { IsActive: false } => new BusinessRuleResult(BranchActive, false, "Branch is not active."),
            _ => new BusinessRuleResult(BranchActive, true, "Branch exists and is active.")
        });

        var supplier = await suppliers.GetSupplierAsync(request.SupplierId, cancellationToken);
        results.Add(supplier switch
        {
            null => new BusinessRuleResult(SupplierNotBlocked, false, "Supplier not found."),
            { IsBlocked: true } => new BusinessRuleResult(SupplierNotBlocked, false, "Supplier is blocked."),
            { IsActive: false } => new BusinessRuleResult(SupplierNotBlocked, false, "Supplier is not active."),
            _ => new BusinessRuleResult(SupplierNotBlocked, true, "Supplier is active and not blocked.")
        });

        var quotation = await suppliers.GetQuotationAsync(request.QuotationId, cancellationToken);
        var quotationProblem = quotation switch
        {
            null => "Quotation not found.",
            _ when quotation.SupplierId != request.SupplierId => "Quotation does not belong to the selected supplier.",
            _ when quotation.ExpiresAt <= DateTimeOffset.UtcNow => $"Quotation expired at {quotation.ExpiresAt:u}.",
            _ when quotation.ProductId != request.ProductId => "Quotation does not cover the requested product.",
            _ when quotation.UnitPrice is not > 0m => "Quotation has no unit price.",
            _ => null
        };
        results.Add(quotationProblem is null
            ? new BusinessRuleResult(QuotationValid, true, $"Quotation is valid until {quotation!.ExpiresAt:u}.")
            : new BusinessRuleResult(QuotationValid, false, quotationProblem));

        results.Add(quotationProblem is null && quotation!.UnitPrice == request.UnitPrice
            ? new BusinessRuleResult(UnitPriceMatchesQuotation, true, "Planned unit price equals the quoted unit price.")
            : new BusinessRuleResult(UnitPriceMatchesQuotation, false,
                quotationProblem is null
                    ? $"Planned unit price {request.UnitPrice:0.00} differs from the quoted {quotation!.UnitPrice:0.00}."
                    : "No valid quotation price to compare against."));

        var product = await products.GetProductAsync(request.ProductId, cancellationToken);
        results.Add(product switch
        {
            null => new BusinessRuleResult(ProductActive, false, "Product not found."),
            { IsActive: false } => new BusinessRuleResult(ProductActive, false, "Product is not active."),
            _ => new BusinessRuleResult(ProductActive, true, "Product exists and is active.")
        });

        results.Add(request.Quantity > 0
            ? new BusinessRuleResult(QuantityPositive, true, $"Quantity {request.Quantity} is positive.")
            : new BusinessRuleResult(QuantityPositive, false, $"Quantity {request.Quantity} must be greater than zero."));

        var openProposalId = await proposals.FindOpenProposalForProductAsync(request.BranchId, request.ProductId, cancellationToken);
        results.Add(openProposalId is { } existingId
            ? new BusinessRuleResult(NoDuplicateOpenOrder, false, $"Proposal {existingId} already covers this product for this branch and is still open.")
            : new BusinessRuleResult(NoDuplicateOpenOrder, true, "No open proposal or purchase order exists for this product at this branch."));

        return new BusinessRuleCheckResponse(results.All(r => r.Passed), results);
    }
}
