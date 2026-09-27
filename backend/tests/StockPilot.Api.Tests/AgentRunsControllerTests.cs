using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities.Agentic;
using StockPilot.Shared.Agents;
using StockPilot.Shared.Data;
using Xunit;

namespace StockPilot.Api.Tests;

/// <summary>GET /api/agent-workflows/audits — every agent's runs for the Agent Monitoring screen.</summary>
public class AgentRunsControllerTests
{
    private static AppDbContext SeededDb()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var now = DateTime.UtcNow;
        db.AgentWorkflowAudits.AddRange(
            new AgentWorkflowAudit { Id = Guid.NewGuid(), AgentName = "DemandForecastAgent", ApprovalStatus = "NotRequired", IsSuccess = true, CreatedAtUtc = now.AddMinutes(-3) },
            new AgentWorkflowAudit { Id = Guid.NewGuid(), AgentName = "ProcurementCoordinatorAgent", ApprovalStatus = "PendingApproval", IsSuccess = true, CreatedAtUtc = now.AddMinutes(-2),
                ToolExecutionsJson = "[{\"toolName\":\"CheckBudget\"}]" },
            new AgentWorkflowAudit { Id = Guid.NewGuid(), AgentName = "ReplenishmentOrchestrator", ApprovalStatus = "PendingHumanApproval", IsSuccess = true, CreatedAtUtc = now.AddMinutes(-1),
                FinalOutcomeJson = "{\"result\":{\"status\":\"PendingApproval\"}}" },
            new AgentWorkflowAudit { Id = Guid.NewGuid(), AgentName = "ReplenishmentOrchestrator", ApprovalStatus = "NotRequired", IsSuccess = false, CreatedAtUtc = now });
        db.SaveChanges();
        return db;
    }

    private static IReadOnlyList<AgentRunSummary> Rows(ActionResult<IReadOnlyList<AgentRunSummary>> result) =>
        (IReadOnlyList<AgentRunSummary>)Assert.IsType<OkObjectResult>(result.Result).Value!;

    [Fact]
    public async Task Lists_every_agents_runs_newest_first_with_one_status_vocabulary()
    {
        using var db = SeededDb();

        var rows = Rows(await new AgentRunsController(db).List());

        Assert.Equal(["ReplenishmentOrchestrator", "ReplenishmentOrchestrator", "ProcurementCoordinatorAgent", "DemandForecastAgent"], rows.Select(r => r.AgentName));
        Assert.Equal(["Failed", "PendingApproval", "PendingApproval", "Completed"], rows.Select(r => r.Status));
        Assert.Equal("CheckBudget", rows[2].ToolExecutions[0].GetProperty("toolName").GetString());
        Assert.Equal("PendingApproval", rows[1].FinalOutcome!.Value.GetProperty("result").GetProperty("status").GetString());
    }

    [Fact]
    public async Task Filters_by_agent_and_caps_take()
    {
        using var db = SeededDb();

        var rows = Rows(await new AgentRunsController(db).List(take: 1000, agentName: "ProcurementCoordinatorAgent"));

        Assert.Single(rows);
        Assert.Equal("ProcurementCoordinatorAgent", rows[0].AgentName);
    }

    [Theory]
    [InlineData(true, "Approved", "Approved")]
    [InlineData(true, "Rejected", "Rejected")]
    [InlineData(true, "PendingHumanApproval", "PendingApproval")]
    [InlineData(false, "PendingApproval", "Failed")]
    public void Normalises_status(bool isSuccess, string approvalStatus, string expected) =>
        Assert.Equal(expected, AgentRunsController.StatusOf(isSuccess, approvalStatus));
}
