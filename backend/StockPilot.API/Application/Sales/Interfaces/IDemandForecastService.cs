using StockPilot.Application.Sales.DTOs;

namespace StockPilot.Application.Sales.Interfaces;

public interface IDemandForecastService
{
    Task<DemandForecastDto> GenerateForecastAsync(GenerateForecastRequestDto request, CancellationToken cancellationToken = default);
    Task<DemandForecastDto?> GetLatestForecastAsync(Guid productId, Guid branchId, CancellationToken cancellationToken = default);
    Task<List<DemandForecastDto>> GetForecastHistoryAsync(Guid? branchId, int take = 20, CancellationToken cancellationToken = default);
    Task<List<ReorderSuggestionDto>> GetReorderSuggestionsAsync(Guid? branchId, CancellationToken cancellationToken = default);
    Task<ReorderSuggestionDto> CalculateReorderMetricsAsync(Guid productId, Guid branchId, decimal currentStock, int leadTimeDays, CancellationToken cancellationToken = default);
}
