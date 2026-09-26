using System.Data.Common;
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StockPilot.Application.AgenticAI.Contracts;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;
using StockPilot.Procurement.Application.Exceptions;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;

public record ToolCallResult<TOutput>(bool Succeeded, TOutput? Output, string? Error);

/// <summary>
/// The only way the agent reaches a tool. Every call is checked against the allow-list, validated
/// against the tool's input schema, run with a per-attempt timeout and a bounded retry, validated
/// against the output schema, and recorded in the workflow trace whether it succeeded or not.
/// </summary>
public class AgentToolGateway(
    IEnumerable<IProcurementAgentTool> registeredTools,
    IAgentSchemaValidator schemas,
    IOptions<ProcurementAgentOptions> options,
    ILogger<AgentToolGateway> logger)
{
    /// <summary>
    /// The complete set of tools this agent may call. A tool registered in DI under any other name
    /// is ignored, so adding e.g. an approval tool elsewhere can never make it reachable from here.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedTools = new HashSet<string>(StringComparer.Ordinal)
    {
        CheckBudgetTool.ToolName,
        ValidateBusinessRulesTool.ToolName,
        CreateProposalTool.ToolName
    };

    private readonly Dictionary<string, IProcurementAgentTool> _tools = registeredTools
        .Where(t => AllowedTools.Contains(t.Name))
        .ToDictionary(t => t.Name, StringComparer.Ordinal);

    public async Task<ToolCallResult<TOutput>> InvokeAsync<TOutput>(
        string toolName, object input, WorkflowStateDto state, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        var stopwatch = Stopwatch.StartNew();
        var inputJson = JsonSerializer.SerializeToElement(input, AgentJson.Options);
        var execution = new ToolExecutionDto
        {
            ToolName = toolName,
            InputParameters = inputJson,
            ExecutedAtUtc = DateTime.UtcNow,
            Attempts = 0
        };
        state.ToolExecutions.Add(execution);

        ToolCallResult<TOutput> Finish(string error)
        {
            stopwatch.Stop();
            execution.IsSuccess = false;
            execution.ErrorMessage = error;
            execution.OutputPayload = new { error };
            execution.DurationMs = (int)stopwatch.ElapsedMilliseconds;
            logger.LogWarning("Agent tool {ToolName} failed after {Attempts} attempt(s): {Error}", toolName, execution.Attempts, error);
            return new ToolCallResult<TOutput>(false, default, error);
        }

        if (!AllowedTools.Contains(toolName) || !_tools.TryGetValue(toolName, out var tool))
        {
            return Finish($"Tool '{toolName}' is not on this agent's allow-list; the call was refused.");
        }

        var inputErrors = schemas.Validate(tool.InputSchema, inputJson);
        if (inputErrors.Count > 0)
        {
            return Finish($"Input rejected by {tool.InputSchema}: {string.Join("; ", inputErrors)}");
        }

        var maxAttempts = 1 + (tool.IsIdempotent ? Math.Max(0, settings.MaxRetries) : 0);
        object? output = null;
        string? lastError = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            execution.Attempts = attempt;
            if (attempt > 1)
            {
                state.RetryCount++;
                await Task.Delay(TimeSpan.FromMilliseconds(settings.RetryBackoffMilliseconds * (attempt - 1)), cancellationToken);
            }

            using var attemptCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            Task<object>? task = null;
            try
            {
                // Inside the try: a tool may throw before it returns its task.
                task = tool.InvokeAsync(inputJson, attemptCts.Token);
                output = await task.WaitAsync(settings.ToolTimeout, cancellationToken);
                lastError = null;
                break;
            }
            catch (TimeoutException) when (task is { IsCompleted: false })
            {
                attemptCts.Cancel();
                lastError = $"Timed out after {settings.ToolTimeoutSeconds}s.";
                if (!await StoppedWithinGraceAsync(task, settings.CancellationGraceMilliseconds))
                {
                    // The tool may still be using a scoped DbContext; retrying now could run two operations on it at once.
                    lastError += " The tool did not stop after cancellation, so no retry was attempted.";
                    break;
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) when (IsTransient(ex))
            {
                lastError = Describe(ex);
                logger.LogWarning(ex, "Transient failure in agent tool {ToolName}, attempt {Attempt}/{MaxAttempts}", toolName, attempt, maxAttempts);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Non-retryable failure in agent tool {ToolName}", toolName);
                return Finish(Describe(ex));
            }
        }

        if (lastError is not null || output is null)
        {
            var retryNote = maxAttempts > 1 ? $" ({execution.Attempts} of {maxAttempts} attempts used)" : " (not retried: tool writes data)";
            return Finish((lastError ?? "Tool returned no output.") + retryNote);
        }

        var outputJson = JsonSerializer.SerializeToElement(output, output.GetType(), AgentJson.Options);
        var outputErrors = schemas.Validate(tool.OutputSchema, outputJson);
        if (outputErrors.Count > 0)
        {
            return Finish($"Output rejected by {tool.OutputSchema}: {string.Join("; ", outputErrors)}");
        }

        stopwatch.Stop();
        execution.IsSuccess = true;
        execution.OutputPayload = outputJson;
        execution.DurationMs = (int)stopwatch.ElapsedMilliseconds;
        return new ToolCallResult<TOutput>(true, outputJson.Deserialize<TOutput>(AgentJson.Options), null);
    }

    private static async Task<bool> StoppedWithinGraceAsync(Task task, int graceMilliseconds)
    {
        // Observe the abandoned task's exception so it isn't reported as unobserved later.
        _ = task.ContinueWith(t => _ = t.Exception, TaskContinuationOptions.OnlyOnFaulted);
        var finished = await Task.WhenAny(task, Task.Delay(graceMilliseconds));
        return finished == task;
    }

    private static bool IsTransient(Exception ex) => ex switch
    {
        TimeoutException or HttpRequestException or IOException => true,
        DbException { IsTransient: true } => true,
        _ => ex.InnerException is DbException { IsTransient: true } or TimeoutException
    };

    /// <summary>
    /// Business exceptions carry messages written for users and are safe to record. Anything else
    /// may embed connection details or internals, so only its type is recorded; the full exception
    /// goes to the server log.
    /// </summary>
    private static string Describe(Exception ex) => ex switch
    {
        ProcurementValidationException validation => string.Join("; ", validation.Errors.SelectMany(e => e.Value.Select(m => $"{e.Key}: {m}"))),
        AgentToolInputException => ex.Message,
        _ when ex.GetType().Namespace == typeof(ProcurementValidationException).Namespace => ex.Message,
        _ => $"{ex.GetType().Name} (details logged server-side)."
    };
}
