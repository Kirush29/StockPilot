namespace StockPilot.Procurement.Application.Dtos.Rules;

/// <summary>A single-product purchase the caller intends to propose, to be checked before it is raised.</summary>
public record BusinessRuleCheckRequest(
    Guid BranchId,
    Guid SupplierId,
    Guid QuotationId,
    Guid ProductId,
    int Quantity,
    decimal UnitPrice);

public record BusinessRuleResult(string Rule, bool Passed, string Details);

/// <summary><paramref name="Passed"/> is true only when every rule in <paramref name="Results"/> passed.</summary>
public record BusinessRuleCheckResponse(bool Passed, IReadOnlyList<BusinessRuleResult> Results);
