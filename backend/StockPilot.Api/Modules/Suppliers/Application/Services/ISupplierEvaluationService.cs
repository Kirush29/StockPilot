using StockPilot.Application.Models;

namespace StockPilot.Application.Services;

public interface ISupplierEvaluationService
{
    Task<SupplierEvaluationResponseDto> EvaluateQuotationsAsync(Guid productId);
}
