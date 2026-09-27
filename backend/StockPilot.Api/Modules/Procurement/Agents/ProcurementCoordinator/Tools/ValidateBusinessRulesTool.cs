using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Procurement.Application.Dtos.Rules;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;

public record ValidateBusinessRulesInput(Guid BranchId, Guid SupplierId, Guid QuotationId, Guid ProductId, int Quantity, decimal UnitPrice);

public record ValidateBusinessRulesOutput(bool Passed, IReadOnlyList<BusinessRuleResult> Results);

/// <summary>Read-only. Wraps <see cref="IProcurementBusinessRuleService"/>.</summary>
public class ValidateBusinessRulesTool(IProcurementBusinessRuleService rules)
    : ProcurementAgentTool<ValidateBusinessRulesInput, ValidateBusinessRulesOutput>
{
    public const string ToolName = "ValidateBusinessRules";

    public override string Name => ToolName;

    public override string InputSchema => "validate-business-rules.input.schema.json";

    public override string OutputSchema => "validate-business-rules.output.schema.json";

    public override bool IsIdempotent => true;

    protected override async Task<ValidateBusinessRulesOutput> ExecuteAsync(ValidateBusinessRulesInput input, CancellationToken cancellationToken)
    {
        var response = await rules.EvaluateAsync(
            new BusinessRuleCheckRequest(input.BranchId, input.SupplierId, input.QuotationId, input.ProductId, input.Quantity, input.UnitPrice),
            cancellationToken);

        return new ValidateBusinessRulesOutput(response.Passed, response.Results);
    }
}
