using System.Text.Json.Serialization;

namespace StockPilot.Application.AgenticAI.Contracts;

public class WorkflowStateDto
{
    [JsonPropertyName("workflowId")]
    public Guid WorkflowId { get; set; } = Guid.NewGuid();

    [JsonPropertyName("objective")]
    public string Objective { get; set; } = string.Empty;

    [JsonPropertyName("initiatedBy")]
    public string InitiatedBy { get; set; } = "system";

    [JsonPropertyName("currentStep")]
    public string CurrentStep { get; set; } = "PlanInitialization";

    [JsonPropertyName("plan")]
    public List<WorkflowPlanStepDto> Plan { get; set; } = new();

    [JsonPropertyName("toolExecutions")]
    public List<ToolExecutionDto> ToolExecutions { get; set; } = new();

    [JsonPropertyName("validationResults")]
    public List<ValidationResultDto> ValidationResults { get; set; } = new();

    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = new();

    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; } = 0;

    [JsonPropertyName("approvalStatus")]
    public string ApprovalStatus { get; set; } = "NotRequired";

    [JsonPropertyName("finalOutcome")]
    public object? FinalOutcome { get; set; }
}

public class WorkflowPlanStepDto
{
    [JsonPropertyName("stepIndex")]
    public int StepIndex { get; set; }

    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "Pending";
}

public class ToolExecutionDto
{
    [JsonPropertyName("toolName")]
    public string ToolName { get; set; } = string.Empty;

    [JsonPropertyName("inputParameters")]
    public object InputParameters { get; set; } = new();

    [JsonPropertyName("outputPayload")]
    public object OutputPayload { get; set; } = new();

    [JsonPropertyName("executedAtUtc")]
    public DateTime ExecutedAtUtc { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("durationMs")]
    public int DurationMs { get; set; }

    [JsonPropertyName("isSuccess")]
    public bool IsSuccess { get; set; } = true;

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

public class ValidationResultDto
{
    [JsonPropertyName("rule")]
    public string Rule { get; set; } = string.Empty;

    [JsonPropertyName("passed")]
    public bool Passed { get; set; }

    [JsonPropertyName("details")]
    public string Details { get; set; } = string.Empty;
}
