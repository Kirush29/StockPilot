using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.Sales.DTOs;

namespace StockPilot.Application.AgenticAI.DemandForecastAgent;

public class DemandForecastWorkflowRequestDto
{
    public Guid ProductId { get; set; }
    public string ProductSku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = "Main Branch";
    public int ForecastDays { get; set; } = 30;
    public int LeadTimeDays { get; set; } = 7;
    public decimal CurrentStockLevel { get; set; } = 50;
    
    // Optional market context / promotional notes
    public string? MarketContextNotes { get; set; }
    public decimal? ExpectedUpliftPercent { get; set; }
    public string InitiatedBy { get; set; } = "SalesManager";
}

public class AgentExecutionResultDto
{
    public bool IsSuccess { get; set; }
    public DemandForecastDto? Forecast { get; set; }
    public WorkflowStateDto WorkflowState { get; set; } = new();
    public string SummaryMessage { get; set; } = string.Empty;
}

public interface IDemandForecastAgent
{
    Task<AgentExecutionResultDto> ExecuteForecastWorkflowAsync(
        DemandForecastWorkflowRequestDto request, 
        CancellationToken cancellationToken = default);

    Task<List<WorkflowStateDto>> GetWorkflowAuditHistoryAsync(
        int take = 20, 
        CancellationToken cancellationToken = default);

    Task<WorkflowStateDto?> GetWorkflowAuditByIdAsync(
        Guid workflowId, 
        CancellationToken cancellationToken = default);
}
