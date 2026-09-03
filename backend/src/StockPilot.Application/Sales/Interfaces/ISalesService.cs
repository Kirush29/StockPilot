using StockPilot.Application.Sales.DTOs;

namespace StockPilot.Application.Sales.Interfaces;

public interface ISalesService
{
    Task<SaleDto> CreateSaleAsync(CreateSaleDto dto, CancellationToken cancellationToken = default);
    Task<List<SaleDto>> GetSalesAsync(Guid? branchId, DateTime? startDate, DateTime? endDate, int take = 50, CancellationToken cancellationToken = default);
    Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SalesAnalyticsSummaryDto> GetSalesAnalyticsAsync(Guid? branchId, int days = 30, CancellationToken cancellationToken = default);
}
