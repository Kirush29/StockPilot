using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;

public record CreateProposalInput(
    Guid BranchId,
    Guid SupplierId,
    Guid QuotationId,
    Guid ProductId,
    int Quantity,
    decimal UnitPrice,
    string Justification);

public record CreateProposalOutput(Guid ProposalId, string Status, decimal TotalEstimatedCost);

/// <summary>
/// The agent's only write. Goes through <see cref="IProcurementProposalService.CreateAsync"/>, so
/// the service re-checks branch, supplier, quotation, products and budget itself. The proposal is
/// always agent-flagged and submitted as PendingApproval; this tool has no way to approve it or
/// to create a purchase order.
/// </summary>
public class CreateProposalTool(IProcurementProposalService proposals) : ProcurementAgentTool<CreateProposalInput, CreateProposalOutput>
{
    public const string ToolName = "CreateProposal";

    public override string Name => ToolName;

    public override string InputSchema => "create-proposal.input.schema.json";

    public override string OutputSchema => "create-proposal.output.schema.json";

    public override bool IsIdempotent => false;

    protected override async Task<CreateProposalOutput> ExecuteAsync(CreateProposalInput input, CancellationToken cancellationToken)
    {
        var created = await proposals.CreateAsync(
            new CreateProposalRequest(
                input.BranchId,
                input.SupplierId,
                input.QuotationId,
                input.Justification,
                CreatedByAgent: true,
                [new ProposalLineItemRequest(input.ProductId, input.Quantity, input.UnitPrice)],
                SubmitForApproval: true),
            cancellationToken);

        return new CreateProposalOutput(created.Id, created.Status.ToString(), created.TotalEstimatedCost);
    }
}
