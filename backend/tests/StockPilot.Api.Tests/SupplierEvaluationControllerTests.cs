using Microsoft.AspNetCore.Mvc;
using Moq;
using StockPilot.Api.Controllers;
using StockPilot.Application.Models;
using StockPilot.Application.Services;
using Xunit;

namespace StockPilot.Api.Tests;

public class SupplierEvaluationControllerTests
{
    private readonly Mock<ISupplierEvaluationService> _serviceMock;
    private readonly SupplierEvaluationController _controller;

    public SupplierEvaluationControllerTests()
    {
        _serviceMock = new Mock<ISupplierEvaluationService>();
        _controller = new SupplierEvaluationController(_serviceMock.Object);
    }

    [Fact]
    public async Task Evaluate_ShouldReturnOk_WithResults()
    {
        var productId = Guid.NewGuid();
        var request = new EvaluateQuotationsRequest { ProductId = productId };
        var resultDto = new SupplierEvaluationResultDto(Guid.NewGuid(), Guid.NewGuid(), "QT-2026-00001", 10m, 5, 4.5m, "Pending", true, "Quotation is eligible.", 100m, 100m, 100m, 100m);
        var candidateDto = new SupplierEvaluationCandidateDto(resultDto.SupplierId, resultDto.QuotationId, "QT-2026-00001", 10m, 5, 4.5m, 100m, 100m, 100m, 100m);
        var responseDto = new SupplierEvaluationResponseDto(
            new List<SupplierEvaluationResultDto> { resultDto },
            new List<SupplierEvaluationCandidateDto> { candidateDto },
            "PendingHumanApproval",
            true
        );

        _serviceMock.Setup(s => s.EvaluateQuotationsAsync(productId)).ReturnsAsync(responseDto);

        var response = await _controller.Evaluate(request);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var returned = Assert.IsAssignableFrom<SupplierEvaluationResponseDto>(okResult.Value);
        Assert.Single(returned.EligibleCandidates);
        Assert.Equal("PendingHumanApproval", returned.DecisionStatus);
        Assert.True(returned.HumanApprovalRequired);
    }

    [Fact]
    public async Task Evaluate_ShouldReturnNotFound_WhenKeyNotFoundExceptionThrown()
    {
        var productId = Guid.NewGuid();
        var request = new EvaluateQuotationsRequest { ProductId = productId };

        _serviceMock.Setup(s => s.EvaluateQuotationsAsync(productId)).ThrowsAsync(new KeyNotFoundException("Product not found."));

        var response = await _controller.Evaluate(request);

        Assert.IsType<NotFoundObjectResult>(response.Result);
    }
}
