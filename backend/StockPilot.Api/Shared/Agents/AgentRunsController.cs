using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Procurement.Domain.Common;

namespace StockPilot.Shared.Agents;

/// <summary>One row of the cross-agent run list (the Agent Monitoring screen).</summary>
public record AgentRunSummary(
    Guid WorkflowId,
    string AgentName,
    string Objective,
    string InitiatedBy,
    string CurrentStep,
    string ApprovalStatus,
    string Status,
    bool IsSuccess,
    DateTime CreatedAtUtc,
    long ExecutionDurationMs,
    JsonElement ToolExecutions,
    JsonElement ValidationResults,
    JsonElement? FinalOutcome);

/// <summary>
/// Read-only list of every agent's runs from the shared AgentWorkflowAudits table (Demand Forecast, Procurement
/// Coordinator and the Replenishment Orchestrator write there). Each module's own trace endpoints are unchanged;
/// this only aggregates them for monitoring.
/// </summary>
[ApiController]
[Route("api/agent-workflows/audits")]
[Authorize(Roles = ProcurementRoles.RaiseOrView)]
[Tags("Orchestrator")]
[Produces("application/json")]
public class AgentRunsController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AgentRunSummary>>> List(
        [FromQuery] int take = 50, [FromQuery] string? agentName = null, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);
        var query = db.AgentWorkflowAudits.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(agentName))
            query = query.Where(a => a.AgentName == agentName);

        var rows = await query.OrderByDescending(a => a.CreatedAtUtc).Take(take).ToListAsync(cancellationToken);

        return Ok(rows.Select(a => new AgentRunSummary(
            a.Id,
            a.AgentName,
            a.Objective,
            a.InitiatedBy,
            a.CurrentStep,
            a.ApprovalStatus,
            StatusOf(a.IsSuccess, a.ApprovalStatus),
            a.IsSuccess,
            a.CreatedAtUtc,
            a.ExecutionDurationMs,
            Json(a.ToolExecutionsJson) ?? EmptyArray,
            Json(a.ValidationResultsJson) ?? EmptyArray,
            Json(a.FinalOutcomeJson))).ToList());
    }

    private static readonly JsonElement EmptyArray = JsonDocument.Parse("[]").RootElement;

    /// <summary>One status vocabulary across agents (each records approval slightly differently).</summary>
    public static string StatusOf(bool isSuccess, string approvalStatus) => (isSuccess, approvalStatus) switch
    {
        (false, _) => "Failed",
        (_, var s) when s.Contains("Pending", StringComparison.OrdinalIgnoreCase) => "PendingApproval",
        (_, "Approved") => "Approved",
        (_, "Rejected") => "Rejected",
        _ => "Completed"
    };

    private static JsonElement? Json(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonDocument.Parse(json).RootElement.Clone(); }
        catch (JsonException) { return null; }
    }
}
