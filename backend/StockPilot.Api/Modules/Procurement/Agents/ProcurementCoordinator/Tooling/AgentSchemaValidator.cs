using System.Collections.Concurrent;
using System.Text.Json;
using Json.Schema;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;

public interface IAgentSchemaValidator
{
    /// <summary>Validates <paramref name="instance"/> against a named schema; returns an empty list when valid.</summary>
    IReadOnlyList<string> Validate(string schemaName, JsonElement instance);
}

/// <summary>
/// Validates against the JSON Schemas in <c>agentic-ai/contracts/procurement-coordinator</c>, which
/// are embedded into this assembly at build time so the contract files stay the single source of truth.
/// </summary>
public class EmbeddedAgentSchemaValidator : IAgentSchemaValidator
{
    private const string ResourcePrefix = "ProcurementCoordinatorSchemas.";

    // Built once per process: the library registers schemas by URI, so rebuilding per instance would collide.
    private static readonly ConcurrentDictionary<string, Lazy<JsonSchema>> Schemas = new();

    private static readonly EvaluationOptions Evaluation = new() { OutputFormat = OutputFormat.List };

    public IReadOnlyList<string> Validate(string schemaName, JsonElement instance)
    {
        var schema = Schemas.GetOrAdd(schemaName, name => new Lazy<JsonSchema>(() => Load(name))).Value;
        var results = schema.Evaluate(instance, Evaluation);
        if (results.IsValid)
        {
            return [];
        }

        var errors = new List<(string Keyword, string Text)>();
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
                errors.Add((keyword, $"{(string.IsNullOrEmpty(location) ? "/" : location)}: {message} ({keyword})"));
            }
        }

        // "Some properties did not match" only summarises the specific property errors.
        var specific = errors.Where(e => e.Keyword != "properties").Select(e => e.Text).Distinct().ToList();
        if (specific.Count > 0)
        {
            return specific;
        }

        return errors.Count > 0 ? errors.Select(e => e.Text).Distinct().ToList() : ["Payload does not match the schema."];
    }

    private static JsonSchema Load(string schemaName)
    {
        var assembly = typeof(EmbeddedAgentSchemaValidator).Assembly;
        using var stream = assembly.GetManifestResourceStream(ResourcePrefix + schemaName)
            ?? throw new InvalidOperationException($"Agent schema '{schemaName}' is not embedded in {assembly.GetName().Name}.");
        using var reader = new StreamReader(stream);
        return JsonSchema.FromText(reader.ReadToEnd(), baseUri: new Uri($"https://stockpilot.local/schemas/procurement-coordinator/{schemaName}"));
    }
}
