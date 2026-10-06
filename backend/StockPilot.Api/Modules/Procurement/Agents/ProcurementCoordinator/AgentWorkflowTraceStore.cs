using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Domain.Entities.Agentic;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator;

/// <summary>Persists agent run state to the shared AgentWorkflowAudits table.</summary>
public interface IAgentWorkflowTraceStore
{
    /// <summary>Inserts the row on first call and updates it on later calls with the same instance.</summary>
    Task SaveAsync(AgentWorkflowAudit audit, CancellationToken cancellationToken);

    /// <summary>A tracked row, so changes can be written back with <see cref="SaveAsync"/>.</summary>
    Task<AgentWorkflowAudit?> FindAsync(Guid workflowId, string agentName, CancellationToken cancellationToken);
}

public class EfAgentWorkflowTraceStore(IApplicationDbContext db) : IAgentWorkflowTraceStore
{
    public async Task SaveAsync(AgentWorkflowAudit audit, CancellationToken cancellationToken)
    {
        if (!db.AgentWorkflowAudits.Local.Contains(audit))
        {
            db.AgentWorkflowAudits.Add(audit);
        }
        else
        {
            audit.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<AgentWorkflowAudit?> FindAsync(Guid workflowId, string agentName, CancellationToken cancellationToken) =>
        db.AgentWorkflowAudits.FirstOrDefaultAsync(a => a.Id == workflowId && a.AgentName == agentName, cancellationToken);
}
