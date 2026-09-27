using System.Text.Json;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;

/// <summary>
/// A tool the Procurement Coordinator Agent may call through <see cref="AgentToolGateway"/>.
/// Tools only receive input that already passed <see cref="InputSchema"/>, and their output is
/// checked against <see cref="OutputSchema"/> before the agent sees it.
/// </summary>
public interface IProcurementAgentTool
{
    string Name { get; }

    /// <summary>Embedded schema file name for the tool's input, e.g. "check-budget.input.schema.json".</summary>
    string InputSchema { get; }

    string OutputSchema { get; }

    /// <summary>False for tools that write; the gateway never retries those, so a timeout can't create a duplicate.</summary>
    bool IsIdempotent { get; }

    Task<object> InvokeAsync(JsonElement input, CancellationToken cancellationToken);
}

/// <summary>Thrown when validated input still can't be bound to the tool's typed input (should not happen if schema and type agree).</summary>
public class AgentToolInputException(string message) : Exception(message);

public abstract class ProcurementAgentTool<TInput, TOutput> : IProcurementAgentTool
    where TOutput : notnull
{
    public abstract string Name { get; }

    public abstract string InputSchema { get; }

    public abstract string OutputSchema { get; }

    public abstract bool IsIdempotent { get; }

    public async Task<object> InvokeAsync(JsonElement input, CancellationToken cancellationToken)
    {
        TInput typed;
        try
        {
            typed = input.Deserialize<TInput>(AgentJson.Options)
                ?? throw new AgentToolInputException($"{Name} input was null.");
        }
        catch (JsonException ex)
        {
            throw new AgentToolInputException($"{Name} input could not be read: {ex.Message}");
        }

        return await ExecuteAsync(typed, cancellationToken);
    }

    protected abstract Task<TOutput> ExecuteAsync(TInput input, CancellationToken cancellationToken);
}
