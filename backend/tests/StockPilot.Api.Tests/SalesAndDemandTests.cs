using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Sales.Services;
using StockPilot.Domain.Enums.Sales;
using StockPilot.Infrastructure.Persistence;

namespace StockPilot.Api.Tests;

public class SalesAndDemandTests
{
    private StockPilotDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<StockPilotDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new StockPilotDbContext(options);
    }

    [Fact]
    public async Task CreateSale_ShouldCalculateSubTotalTaxAndGrandTotalCorrectly()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var salesService = new SalesService(context);

        var request = new CreateSaleDto
        {
            BranchName = "Colombo Central Branch",
            PaymentMethod = PaymentMethod.Cash,
            Items = new List<CreateSaleItemDto>
            {
                new CreateSaleItemDto
                {
                    ProductId = Guid.NewGuid(),
                    ProductSku = "SKU-PARACETAMOL-500",
                    ProductName = "Paracetamol 500mg",
                    Category = "Pharmaceuticals",
                    Quantity = 10,
                    UnitPrice = 20.00m,
                    DiscountPercent = 10.0m // 10% discount on $200 = $20 discount -> $180 discounted subtotal
                },
                new CreateSaleItemDto
                {
                    ProductId = Guid.NewGuid(),
                    ProductSku = "SKU-AMOXICILLIN-250",
                    ProductName = "Amoxicillin 250mg",
                    Category = "Antibiotics",
                    Quantity = 5,
                    UnitPrice = 30.00m,
                    DiscountPercent = 0.0m // $150
                }
            }
        };

        // Act
        var result = await salesService.CreateSaleAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.StartsWith("INV-", result.InvoiceNumber);
        Assert.Equal(350.00m, result.SubTotal); // $200 + $150
        Assert.Equal(20.00m, result.DiscountAmount); // $20
        // Taxable amount = $330. Tax 5% of $330 = $16.50
        Assert.Equal(16.50m, result.TaxAmount);
        Assert.Equal(346.50m, result.TotalAmount); // $330 + $16.50
        Assert.Equal(2, result.Items.Count);
    }

    [Fact]
    public async Task CreateSale_WithEmptyItems_ShouldThrowArgumentException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var salesService = new SalesService(context);

        var request = new CreateSaleDto
        {
            BranchName = "Test Branch",
            Items = new List<CreateSaleItemDto>()
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => salesService.CreateSaleAsync(request));
    }

    [Fact]
    public async Task GenerateForecast_ShouldReturnPositiveDemandAndConfidenceBounds()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var forecastService = new DemandForecastService(context);

        var request = new GenerateForecastRequestDto
        {
            ProductId = Guid.NewGuid(),
            ProductSku = "SKU-TEST-01",
            ProductName = "Test Product",
            BranchId = Guid.NewGuid(),
            BranchName = "Main Branch",
            Period = ForecastPeriod.Next30Days,
            LeadTimeDays = 7,
            CurrentStockLevel = 50
        };

        // Act
        var forecast = await forecastService.GenerateForecastAsync(request);

        // Assert
        Assert.NotNull(forecast);
        Assert.True(forecast.PredictedTotalDemand > 0);
        Assert.True(forecast.AverageDailyDemand > 0);
        Assert.True(forecast.RecommendedSafetyStock >= 0);
        Assert.Equal(30, forecast.Items.Count);
        Assert.All(forecast.Items, item =>
        {
            Assert.True(item.PredictedQuantity >= 0);
            Assert.True(item.LowerBoundQuantity <= item.PredictedQuantity);
            Assert.True(item.UpperBoundQuantity >= item.PredictedQuantity);
        });
    }

    [Fact]
    public async Task CalculateReorderMetrics_ShouldComputeDeterministicROP()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var forecastService = new DemandForecastService(context);

        var productId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var currentStock = 10m;
        var leadTimeDays = 7;

        // Act
        var metrics = await forecastService.CalculateReorderMetricsAsync(productId, branchId, currentStock, leadTimeDays);

        // Assert
        Assert.NotNull(metrics);
        Assert.True(metrics.ReorderPoint > 0);
        Assert.True(metrics.SafetyStock > 0);
        Assert.True(metrics.NeedsReorder); // Stock 10 is below ROP
        Assert.Equal("Critical", metrics.UrgencyLevel);
    }
}
