using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.Application.AgenticAI.ProcurementCoordinator;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.API.Controllers;

/// <summary>
/// Procurement Coordinator Agent workflows. React/Flutter call these endpoints; they never reach
/// the agent or its tools directly. The agent stops at PendingApproval and approval is always a
/// human request to <c>/approve</c>.
/// </summary>
[Route("api/agent-workflows")]
[Authorize]
[Produces("application/json")]
public class ProcurementAgentWorkflowsController(
    IProcurementCoordinatorAgent agent,
    IProcurementProposalService proposalService,
    IAuthorizationService authorizationService,
    ICurrentUserService currentUser) : ProcurementControllerBase
{
    /// <summary>
    /// Start a Procurement Coordinator Agent run for a reorder signal. Body: { triggerType, productId,
    /// branchId, suggestedQuantity, candidateSupplierId, quotationId, sourceAgent } (see
    /// agentic-ai/contracts/procurement-coordinator/workflow-input.schema.json).
    /// </summary>
    /// <response code="201">A proposal was created and is PendingApproval.</response>
    /// <response code="422">The payload was invalid or the budget/business-rule checks failed; nothing was created.</response>
    /// <response code="503">A tool failed (timeout, retries exhausted, invalid output); nothing was approved.</response>
    [HttpPost("procurement/start")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(ProcurementWorkflowResult), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProcurementWorkflowResult), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProcurementWorkflowResult), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ProcurementWorkflowResult>> Start([FromBody] JsonElement objective, CancellationToken cancellationToken)
    {
        // The raw payload goes to the agent so that an invalid one is still recorded as a failed run.
        var result = await agent.StartAsync(objective, currentUser.UserId.ToString(), cancellationToken);

        return result.Status switch
        {
            ProcurementWorkflowStatus.PendingApproval => CreatedAtAction(nameof(GetById), new { workflowId = result.WorkflowId }, result),
            ProcurementWorkflowStatus.ChecksFailed or ProcurementWorkflowStatus.InvalidInput => UnprocessableEntity(result),
            _ => StatusCode(StatusCodes.Status503ServiceUnavailable, result)
        };
    }

    /// <summary>Workflow status, the output contract, the live status of its proposal, and the full execution trace.</summary>
    [HttpGet("{workflowId:guid}")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(ProcurementWorkflowDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProcurementWorkflowDetailResponse>> GetById(Guid workflowId, CancellationToken cancellationToken)
    {
        var workflow = await agent.GetWorkflowAsync(workflowId, cancellationToken);
        return workflow is null ? WorkflowNotFound(workflowId) : Ok(workflow);
    }

    /// <summary>
    /// Human approval of the proposal a workflow produced. Delegates to the same service call and
    /// approval-limit policy as POST /api/procurement/proposals/{id}/decision. Approving never
    /// creates a purchase order; conversion stays a separate step.
    /// </summary>
    [HttpPost("{workflowId:guid}/approve")]
    [Authorize(Roles = ProcurementRoles.ManageProcurement)]
    [ProducesResponseType(typeof(ProposalDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProposalDetailResponse>> Approve(
        Guid workflowId, [FromBody] ApproveWorkflowRequest? request, CancellationToken cancellationToken)
    {
        var workflow = await agent.GetWorkflowAsync(workflowId, cancellationToken);
        if (workflow is null)
        {
            return WorkflowNotFound(workflowId);
        }

        if (workflow.ProposalId is not { } proposalId)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Nothing to approve",
                detail: $"Workflow {workflowId} ended with status {workflow.Status} and did not create a proposal.");
        }

        var proposal = await proposalService.GetByIdAsync(proposalId, cancellationToken);
        var authResult = await authorizationService.AuthorizeAsync(User, proposal, "CanApproveProcurement");
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var decided = await proposalService.DecideAsync(
            proposalId, new DecisionRequest(ApprovalDecisionType.Approved, request?.Comment), cancellationToken);
        await agent.RecordHumanDecisionAsync(workflowId, ApprovalDecisionType.Approved.ToString(), currentUser.UserId.ToString(), cancellationToken);
        return Ok(decided);
    }

    private NotFoundObjectResult WorkflowNotFound(Guid workflowId) =>
        NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Workflow not found",
            Detail = $"No Procurement Coordinator Agent workflow {workflowId} exists."
        });
}
