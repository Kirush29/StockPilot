using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Shared.Agents.Orchestrator;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Domain.Common;

namespace StockPilot.Shared.Agents.Orchestrator;

/// <summary>
/// Replenishment Orchestrator: one request takes a product at a branch through Inventory Optimization, Demand
/// Forecast, Supplier Evaluation and the Procurement Coordinator, and stops for human approval. Clients never
/// reach the agents directly. Approval stays with each module's existing endpoints.
/// </summary>
[ApiController]
[Route("api/agent-workflows/replenishment")]
[Authorize]
[Produces("application/json")]
[Tags("Orchestrator")]
public class ReplenishmentWorkflowsController(IReplenishmentOrchestrator orchestrator, ICurrentUserService currentUser) : ControllerBase
{
    /// <summary>
    /// Start a run. Body: { branchId, productId, forecastDays?, leadTimeDays? }
    /// (see agentic-ai/contracts/replenishment-orchestrator/workflow-input.schema.json).
    /// Roles: those allowed to trigger every agent it calls (Inventory "AiAnalyze" and Procurement start: the same three roles).
    /// </summary>
    /// <response code="201">The run finished at a human decision or with nothing to do; see status and nextAction.</response>
    /// <response code="422">The objective was invalid, or Procurement's budget/business-rule checks failed.</response>
    /// <response code="503">An agent failed or a hand-off broke its contract; nothing was approved.</response>
    [HttpPost("start")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(ReplenishmentWorkflowResult), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ReplenishmentWorkflowResult), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ReplenishmentWorkflowResult), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ReplenishmentWorkflowResult>> Start([FromBody] JsonElement objective, CancellationToken cancellationToken)
    {
        var result = await orchestrator.StartAsync(objective, currentUser.UserId.ToString(), cancellationToken);

        return result.Status switch
        {
            ReplenishmentWorkflowStatus.InvalidInput or ReplenishmentWorkflowStatus.ChecksFailed => UnprocessableEntity(result),
            ReplenishmentWorkflowStatus.Failed => StatusCode(StatusCodes.Status503ServiceUnavailable, result),
            _ => CreatedAtAction(nameof(GetById), new { workflowId = result.WorkflowId }, result)
        };
    }

    /// <summary>The run's result, the live status of any proposal it created, and the full execution trace.</summary>
    [HttpGet("{workflowId:guid}")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(ReplenishmentWorkflowDetail), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReplenishmentWorkflowDetail>> GetById(Guid workflowId, CancellationToken cancellationToken)
    {
        var workflow = await orchestrator.GetWorkflowAsync(workflowId, cancellationToken);
        return workflow is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Workflow not found.", detail: $"No replenishment workflow {workflowId}.")
            : Ok(workflow);
    }
}
