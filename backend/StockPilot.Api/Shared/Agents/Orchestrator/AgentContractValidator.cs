using System.Collections.Concurrent;
using System.Text.Json;
using Json.Schema;

namespace StockPilot.Shared.Agents.Orchestrator;

public interface IAgentContractValidator
{
    /// <summary>
    /// Validates <paramref name="instance"/> against a contract in <c>agentic-ai/contracts</c>, named by its path
    /// under that folder with '/' replaced by '.' (e.g. <c>supplier-evaluation-output.schema.json</c>,
    /// <c>replenishment-orchestrator.workflow-input.schema.json</c>). Returns an empty list when valid.
    /// </summary>
    IReadOnlyList<string> Validate(string contractName, JsonElement instance);
}

/// <summary>
/// Validates agent hand-offs against the agents' own published contract files, embedded at build time
/// (see StockPilot.API.csproj), so the files in <c>agentic-ai/contracts</c> stay the single source of truth.
/// Same approach as the Procurement Coordinator's <c>EmbeddedAgentSchemaValidator</c>, for the other agents' contracts.
/// </summary>
public class EmbeddedAgentContractValidator : IAgentContractValidator
{
    private const string ResourcePrefix = "AgentContracts.";

    // Built once per process: the library registers schemas by URI, so rebuilding per instance would collide.
    private static readonly ConcurrentDictionary<string, Lazy<JsonSchema>> Schemas = new();

    private static readonly EvaluationOptions Evaluation = new() { OutputFormat = OutputFormat.List };

    public IReadOnlyList<string> Validate(string contractName, JsonElement instance)
    {
        var schema = Schemas.GetOrAdd(contractName, name => new Lazy<JsonSchema>(() => Load(name))).Value;
        var results = schema.Evaluate(instance, Evaluation);
        if (results.IsValid)
        {
            return [];
        }

        var errors = new List<string>();
        foreach (var node in (results.Details ?? []).Prepend(results))
        {
            // Failures inside a "not" are what made the "not" pass, so they aren't errors.
            if (node.Errors is null || node.IsValid || node.EvaluationPath.ToString().Contains("/not"))
            {
                continue;
            }

            var location = node.InstanceLocation.ToString();
            foreach (var (keyword, message) in node.Errors)
            {
                if (keyword != "properties")
                {
                    errors.Add($"{(string.IsNullOrEmpty(location) ? "/" : location)}: {message} ({keyword})");
                }
            }
        }

        return errors.Count > 0 ? errors.Distinct().ToList() : ["Payload does not match the contract."];
    }

    private static JsonSchema Load(string contractName)
    {
        var assembly = typeof(EmbeddedAgentContractValidator).Assembly;
        using var stream = assembly.GetManifestResourceStream(ResourcePrefix + contractName)
            ?? throw new InvalidOperationException($"Agent contract '{contractName}' is not embedded in {assembly.GetName().Name}.");
        using var reader = new StreamReader(stream);
        return JsonSchema.FromText(reader.ReadToEnd(), baseUri: new Uri($"https://stockpilot.local/contracts/{contractName}"));
    }
}
