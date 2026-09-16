using StockPilot.Domain.Common;

namespace StockPilot.Domain.Entities.Agentic;

public class AgentWorkflowAudit : AuditableEntity
{
    public string AgentName { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string InitiatedBy { get; set; } = "system";
    public string CurrentStep { get; set; } = "PlanInitialization";
    
    // JSON payloads representing structured state
    public string PlanJson { get; set; } = "[]";
    public string ToolExecutionsJson { get; set; } = "[]";
    public string ValidationResultsJson { get; set; } = "[]";
    public string ErrorsJson { get; set; } = "[]";
    public string? FinalOutcomeJson { get; set; }

    public int RetryCount { get; set; } = 0;
    public string ApprovalStatus { get; set; } = "NotRequired";
    public long ExecutionDurationMs { get; set; } = 0;
    public bool IsSuccess { get; set; } = true;
}
