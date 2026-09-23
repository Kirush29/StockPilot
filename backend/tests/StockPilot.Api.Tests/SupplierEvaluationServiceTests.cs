using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Models;
using StockPilot.Application.Services;
using StockPilot.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

public class SupplierEvaluationServiceTests
{
    private readonly Mock<IQuotationRepository> _quotationRepositoryMock;
    private readonly Mock<ISupplierRepository> _supplierRepositoryMock;
    private readonly Mock<IProductRepository> _productRepositoryMock;
    private readonly Mock<IAgenticAiIntegrationService> _aiIntegrationServiceMock;
    private readonly SupplierEvaluationService _service;

    public SupplierEvaluationServiceTests()
    {
        _quotationRepositoryMock = new Mock<IQuotationRepository>();
        _supplierRepositoryMock = new Mock<ISupplierRepository>();
        _productRepositoryMock = new Mock<IProductRepository>();
        _aiIntegrationServiceMock = new Mock<IAgenticAiIntegrationService>();

        _aiIntegrationServiceMock.Setup(s => s.EvaluateCandidatesAsync(It.IsAny<Guid>(), It.IsAny<IReadOnlyList<SupplierEvaluationCandidateDto>>()))
            .ReturnsAsync(new SupplierEvaluationResponseDto(
                new List<SupplierEvaluationResultDto>(),
                new List<SupplierEvaluationCandidateDto>(),
                "PendingHumanApproval",
                true
            ));

        _service = new SupplierEvaluationService(
            _quotationRepositoryMock.Object,
            _supplierRepositoryMock.Object,
            _productRepositoryMock.Object,
            _aiIntegrationServiceMock.Object);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldReturnEvaluations_WhenQuotationsExist()
    {
        var productId = Guid.NewGuid();
        
        // Mock AI Service to return a valid response
        _aiIntegrationServiceMock.Setup(s => s.EvaluateCandidatesAsync(It.IsAny<Guid>(), It.IsAny<IReadOnlyList<SupplierEvaluationCandidateDto>>()))
            .ReturnsAsync(new SupplierEvaluationResponseDto(
                new List<SupplierEvaluationResultDto>(),
                new List<SupplierEvaluationCandidateDto>(),
                "PendingHumanApproval",
                false // The fake returns false to test that the service enforces true
            ));

        var product = new Product { Id = productId, Name = "Laptop", SKU = "LAP-001" };
        var supplierId = Guid.NewGuid();
        var supplier = new Supplier { Id = supplierId, IsActive = true, Rating = 4.5m };
        var quotations = new List<Quotation> 
        { 
            new Quotation { 
                Id = Guid.NewGuid(), 
                ProductId = productId, 
                SupplierId = supplierId, 
                UnitPrice = 10m, 
                DeliveryDays = 5, 
                Status = QuotationStatus.Pending,
                ValidUntil = DateTime.UtcNow.AddDays(1)
            } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.Equal(supplierId, result[0].SupplierId);
        Assert.Equal(4.5m, result[0].SupplierRating);
        Assert.True(result[0].Eligibility);
        Assert.Equal("Quotation is eligible.", result[0].EligibilityReason);
        Assert.Equal(100m, result[0].PriceScore);
        Assert.Equal(100m, result[0].DeliveryScore);
        Assert.Equal(100m, result[0].RatingScore);
        Assert.Equal(100m, result[0].OverallScore);
        Assert.Single(response.EligibleCandidates);
        Assert.Equal("PendingHumanApproval", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldReturnEmpty_WhenNoQuotations()
    {
        var productId = Guid.NewGuid();
        var product = new Product { Id = productId };
        
        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(new List<Quotation>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Empty(result);
        Assert.Empty(response.EligibleCandidates);
        Assert.Equal("NoEligibleSupplier", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldThrowException_WhenProductDoesNotExist()
    {
        var productId = Guid.NewGuid();
        
        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync((Product?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.EvaluateQuotationsAsync(productId));
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldThrowException_WhenSupplierDoesNotExist()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var quotations = new List<Quotation> 
        { 
            new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync((Supplier?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.EvaluateQuotationsAsync(productId));
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldReturnIneligible_WhenSupplierIsInactive()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier = new Supplier { Id = supplierId, IsActive = false };
        var quotations = new List<Quotation> 
        { 
            new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(new List<SupplierRating>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.False(result[0].Eligibility);
        Assert.Equal("Supplier is not active.", result[0].EligibilityReason);
        Assert.Empty(response.EligibleCandidates);
        Assert.Equal("NoEligibleSupplier", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldReturnIneligible_WhenQuotationIsNotPending()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier = new Supplier { Id = supplierId, IsActive = true };
        var quotations = new List<Quotation> 
        { 
            new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId, Status = QuotationStatus.Rejected, ValidUntil = DateTime.UtcNow.AddDays(1) } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(new List<SupplierRating>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.False(result[0].Eligibility);
        Assert.Equal($"Quotation status is {QuotationStatus.Rejected}, not Pending.", result[0].EligibilityReason);
        Assert.Empty(response.EligibleCandidates);
        Assert.Equal("NoEligibleSupplier", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldReturnIneligible_WhenQuotationIsExpired()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier = new Supplier { Id = supplierId, IsActive = true };
        var quotations = new List<Quotation> 
        { 
            new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(-1) } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(new List<SupplierRating>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.False(result[0].Eligibility);
        Assert.Equal("Quotation has expired.", result[0].EligibilityReason);
        Assert.Empty(response.EligibleCandidates);
        Assert.Equal("NoEligibleSupplier", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldHandleMultipleQuotationsWithMixedEligibility()
    {
        var productId = Guid.NewGuid();
        var supplierId1 = Guid.NewGuid();
        var supplierId2 = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier1 = new Supplier { Id = supplierId1, IsActive = true };
        var supplier2 = new Supplier { Id = supplierId2, IsActive = false };

        var quotation1 = new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId1, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) };
        var quotation2 = new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId2, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(new List<Quotation> { quotation1, quotation2 });
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId1)).ReturnsAsync(supplier1);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId2)).ReturnsAsync(supplier2);
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(It.IsAny<Guid>())).ReturnsAsync(new List<SupplierRating>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Equal(2, result.Count);
        
        var eval1 = result.Single(r => r.QuotationId == quotation1.Id);
        Assert.True(eval1.Eligibility);
        
        var eval2 = result.Single(r => r.QuotationId == quotation2.Id);
        Assert.False(eval2.Eligibility);
        Assert.Equal("Supplier is not active.", eval2.EligibilityReason);
        Assert.Single(response.EligibleCandidates);
        Assert.Equal("PendingHumanApproval", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldCalculateScoresCorrectly_WhenMultipleQuotationsAreEligible()
    {
        var productId = Guid.NewGuid();
        
        _aiIntegrationServiceMock.Setup(s => s.EvaluateCandidatesAsync(It.IsAny<Guid>(), It.IsAny<IReadOnlyList<SupplierEvaluationCandidateDto>>()))
            .ReturnsAsync(new SupplierEvaluationResponseDto(
                new List<SupplierEvaluationResultDto>(),
                new List<SupplierEvaluationCandidateDto>(),
                "PendingHumanApproval",
                true
            ));

        var product = new Product { Id = productId, Name = "Laptop", SKU = "LAP-001" };
        var supplierId1 = Guid.NewGuid();
        var supplierId2 = Guid.NewGuid();
        var supplier1 = new Supplier { Id = supplierId1, IsActive = true, Rating = 4.5m };
        var supplier2 = new Supplier { Id = supplierId2, IsActive = true, Rating = 5.0m };

        var quotation1 = new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId1, UnitPrice = 10m, DeliveryDays = 5, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) };
        var quotation2 = new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId2, UnitPrice = 20m, DeliveryDays = 2, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) };
        
        // Lowest price = 10, Fastest delivery = 2.
        // Supplier1 ratings: 4.5. Supplier2 ratings: 5.0. Highest rating = 5.0.
        // Quotation1 scores: Price = (10/10)*100 = 100. Delivery = (2/5)*100 = 40. Rating = (4.5/5.0)*100 = 90. 
        // Quotation1 Overall = (100 * 0.5) + (40 * 0.3) + (90 * 0.2) = 50 + 12 + 18 = 80.
        // Quotation2 scores: Price = (10/20)*100 = 50. Delivery = (2/2)*100 = 100. Rating = (5.0/5.0)*100 = 100.
        // Quotation2 Overall = (50 * 0.5) + (100 * 0.3) + (100 * 0.2) = 25 + 30 + 20 = 75.

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(new List<Quotation> { quotation1, quotation2 });
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId1)).ReturnsAsync(supplier1);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId2)).ReturnsAsync(supplier2);

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Equal(2, result.Count);
        
        var eval1 = result.Single(r => r.QuotationId == quotation1.Id);
        Assert.Equal(100m, eval1.PriceScore);
        Assert.Equal(40m, eval1.DeliveryScore);
        Assert.Equal(90m, eval1.RatingScore);
        Assert.Equal(80m, eval1.OverallScore);

        var eval2 = result.Single(r => r.QuotationId == quotation2.Id);
        Assert.Equal(50m, eval2.PriceScore);
        Assert.Equal(100m, eval2.DeliveryScore);
        Assert.Equal(100m, eval2.RatingScore);
        Assert.Equal(75m, eval2.OverallScore);
        Assert.Equal(2, response.EligibleCandidates.Count);
        Assert.Equal("PendingHumanApproval", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldLeaveScoresNull_WhenNoEligibleQuotations()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier = new Supplier { Id = supplierId, IsActive = false }; // Ineligible
        var quotations = new List<Quotation> 
        { 
            new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId, UnitPrice = 10m, DeliveryDays = 5, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) } 
        };

        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(quotations);
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(new List<SupplierRating>());

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.False(result[0].Eligibility);
        Assert.Null(result[0].PriceScore);
        Assert.Null(result[0].DeliveryScore);
        Assert.Null(result[0].RatingScore);
        Assert.Null(result[0].OverallScore);
        Assert.Empty(response.EligibleCandidates);
        Assert.Equal("NoEligibleSupplier", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateQuotationsAsync_ShouldHandleZeroValuesCorrectly()
    {
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var product = new Product { Id = productId };
        var supplier = new Supplier { Id = supplierId, IsActive = true };
        
        var quotation = new Quotation { Id = Guid.NewGuid(), ProductId = productId, SupplierId = supplierId, UnitPrice = 0m, DeliveryDays = 0, Status = QuotationStatus.Pending, ValidUntil = DateTime.UtcNow.AddDays(1) };
        
        _productRepositoryMock.Setup(r => r.GetByIdAsync(productId)).ReturnsAsync(product);
        _quotationRepositoryMock.Setup(r => r.GetByProductIdAsync(productId)).ReturnsAsync(new List<Quotation> { quotation });
        _supplierRepositoryMock.Setup(r => r.GetByIdAsync(supplierId)).ReturnsAsync(supplier);
        
        // Zero ratings
        _supplierRepositoryMock.Setup(r => r.GetRatingsAsync(supplierId)).ReturnsAsync(new List<SupplierRating> { new SupplierRating { Rating = 0m } });

        var response = await _service.EvaluateQuotationsAsync(productId);
        var result = response.AllEvaluations;

        Assert.Single(result);
        Assert.True(result[0].Eligibility);
        
        // Fallback for 0 is 100m for Price and Delivery, and 0 for Rating when highest is 0
        Assert.Equal(100m, result[0].PriceScore);
        Assert.Equal(100m, result[0].DeliveryScore);
        Assert.Equal(0m, result[0].RatingScore);
        
        // (100 * 0.5) + (100 * 0.3) + (0 * 0.2) = 50 + 30 + 0 = 80
        Assert.Equal(80m, result[0].OverallScore);
        Assert.Single(response.EligibleCandidates);
        Assert.Equal("PendingHumanApproval", response.DecisionStatus);
        Assert.True(response.HumanApprovalRequired);
    }
}
