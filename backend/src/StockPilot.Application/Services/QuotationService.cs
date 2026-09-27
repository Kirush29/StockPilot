using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;

namespace StockPilot.Application.Services;

public class QuotationService : IQuotationService
{
    private readonly IQuotationRepository _quotationRepository;
    private readonly ISupplierRepository _supplierRepository;
    private readonly IProductRepository _productRepository;
    private readonly IEmailNotificationService _emailNotificationService;

    public QuotationService(
        IQuotationRepository quotationRepository,
        ISupplierRepository supplierRepository,
        IProductRepository productRepository,
        IEmailNotificationService emailNotificationService)
    {
        _quotationRepository = quotationRepository;
        _supplierRepository = supplierRepository;
        _productRepository = productRepository;
        _emailNotificationService = emailNotificationService;
    }

    public Task<Quotation?> GetByIdAsync(Guid id)
    {
        return _quotationRepository.GetByIdAsync(id);
    }

    public Task<IReadOnlyList<Quotation>> GetAllAsync()
    {
        return _quotationRepository.GetAllAsync();
    }

    public async Task<Quotation> CreateAsync(Quotation quotation)
    {
        var supplier = await _supplierRepository.GetByIdAsync(quotation.SupplierId);
        if (supplier is null)
        {
            throw new KeyNotFoundException("Supplier not found.");
        }

        var product = await _productRepository.GetByIdAsync(quotation.ProductId);
        if (product is null)
        {
            throw new KeyNotFoundException("Product not found.");
        }

        var seq = await _quotationRepository.GetNextReferenceSequenceAsync();
        var year = DateTime.UtcNow.Year;
        quotation.QuotationReference = $"QT-{year}-{seq:D5}";

        await _quotationRepository.AddAsync(quotation);

        // Notify about approval request
        _ = _emailNotificationService.SendEmailAsync(
            supplier.ContactEmail,
            "New Approval Request (Quotation)",
            $"You have a new approval request (Quotation Reference: {quotation.QuotationReference}) for product {product.Name}. Please review.");

        return quotation;
    }
    public async Task<bool> UpdateStatusAsync(Guid id, string status)
    {
        var quotation = await _quotationRepository.GetByIdAsync(id);
        if (quotation is null)
        {
            return false;
        }

        quotation.Status = status;
        await _quotationRepository.UpdateAsync(quotation);

        var supplier = await _supplierRepository.GetByIdAsync(quotation.SupplierId);
        if (supplier != null)
        {
            _ = _emailNotificationService.SendEmailAsync(
                supplier.ContactEmail,
                $"Purchase-Order Status Change: {quotation.QuotationReference}",
                $"The status of your quotation/purchase-order {quotation.QuotationReference} has changed to: {status}");
        }

        return true;
    }

    public Task<IReadOnlyList<Quotation>> GetByProductIdAsync(Guid productId)
    {
        return _quotationRepository.GetByProductIdAsync(productId);
    }

    public Task<IReadOnlyList<Quotation>> GetBySupplierIdAsync(Guid supplierId)
    {
        return _quotationRepository.GetBySupplierIdAsync(supplierId);
    }
}
