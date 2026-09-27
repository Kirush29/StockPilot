using StockPilot.Procurement.Application.Dtos.Rules;

namespace StockPilot.Procurement.Application.Services;

public interface IProcurementBusinessRuleService
{
    /// <summary>
    /// Evaluates every procurement business rule for a planned purchase and reports each outcome.
    /// Read-only; never throws for a rule violation, only reports it.
    /// </summary>
    Task<BusinessRuleCheckResponse> EvaluateAsync(BusinessRuleCheckRequest request, CancellationToken cancellationToken = default);
}
