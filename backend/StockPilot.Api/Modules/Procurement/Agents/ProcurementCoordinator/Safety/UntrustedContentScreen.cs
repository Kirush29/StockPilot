using System.Text.RegularExpressions;

namespace StockPilot.Application.AgenticAI.ProcurementCoordinator.Safety;

public record ScreenedText(string Field, bool Flagged, IReadOnlyList<string> Indicators);

/// <summary>
/// Flags instruction-like text in data that came from outside this agent (supplier quotation
/// notes, names from other modules). This is a tripwire for the audit trail and the human
/// reviewer, not the main defence: the workflow is fixed code, tool arguments are built only
/// from typed fields, and free text never reaches a tool argument or decides a branch. Flagged
/// text is also withheld from the justification and from any LLM prompt.
/// </summary>
public static class UntrustedContentScreen
{
    private static readonly (string Indicator, Regex Pattern)[] Patterns =
    [
        ("override-instructions", Rx(@"\b(ignore|disregard|forget|override)\b.{0,40}\b(instructions?|rules?|prompts?|guidelines|policy|polic(y|ies))\b")),
        ("role-injection", Rx(@"(^|\n|\s)(system|assistant|developer)\s*:|\byou are now\b|\bact as\b|\bnew instructions?\b|\bsystem prompt\b")),
        ("approval-manipulation", Rx(@"\b(auto[- ]?approve|approve (this|the|it|immediately)|mark (it |this )?(as )?approved|skip (the )?(approval|review|human))\b")),
        ("value-manipulation", Rx(@"\b(set|change|increase|raise|update)\b.{0,30}\b(quantity|price|amount|budget|status|supplier)\b.{0,15}\bto\b")),
        ("tool-invocation", Rx(@"\b(call|invoke|run|execute)\b.{0,20}\b(tool|function|createproposal|checkbudget|validatebusinessrules|endpoint)\b")),
        ("control-bypass", Rx(@"\b(bypass|disable|turn off)\b.{0,30}\b(validation|checks?|budget|rules?|approval)\b|\bjailbreak\b")),
        ("code-or-sql", Rx(@"<\s*script|javascript:|\bdrop\s+table\b|\bdelete\s+from\b|\binsert\s+into\b|;\s*--"))
    ];

    public static ScreenedText Screen(string field, string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new ScreenedText(field, false, []);
        }

        var indicators = Patterns.Where(p => p.Pattern.IsMatch(text)).Select(p => p.Indicator).ToList();
        return new ScreenedText(field, indicators.Count > 0, indicators);
    }

    public static bool LooksLikeInstructions(string? text) => Screen("text", text).Flagged;

    private static Regex Rx(string pattern) =>
        new(pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled, TimeSpan.FromMilliseconds(250));
}
