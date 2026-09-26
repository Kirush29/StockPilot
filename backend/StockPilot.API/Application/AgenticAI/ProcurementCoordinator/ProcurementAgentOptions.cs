namespace StockPilot.Application.AgenticAI.ProcurementCoordinator;

/// <summary>Bound from configuration section "Procurement:CoordinatorAgent".</summary>
public class ProcurementAgentOptions
{
    public const string SectionName = "Procurement:CoordinatorAgent";

    /// <summary>Per-attempt time limit for a tool call. Fractions are allowed.</summary>
    public double ToolTimeoutSeconds { get; set; } = 10;

    /// <summary>Retries after the first attempt for idempotent tools. Non-idempotent tools (CreateProposal) are never retried.</summary>
    public int MaxRetries { get; set; } = 2;

    /// <summary>Delay before retry n is n × this value.</summary>
    public int RetryBackoffMilliseconds { get; set; } = 250;

    /// <summary>How long to wait for a timed-out tool to observe cancellation before a retry is abandoned.</summary>
    public int CancellationGraceMilliseconds { get; set; } = 1000;

    /// <summary>Time limit for the optional LLM justification draft; the template is used on timeout.</summary>
    public int LlmTimeoutSeconds { get; set; } = 15;

    public TimeSpan ToolTimeout => TimeSpan.FromSeconds(ToolTimeoutSeconds);
}
