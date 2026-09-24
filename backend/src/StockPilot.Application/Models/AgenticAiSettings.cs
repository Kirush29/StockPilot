namespace StockPilot.Application.Models;

public class AgenticAiSettings
{
    public string PythonPath { get; set; } = "python";
    public string WorkingDirectory { get; set; } = "../../../agentic-ai";
    public string EntryPoint { get; set; } = "src/__main__.py";
    public int TimeoutSeconds { get; set; } = 60;
    public string AgentMode { get; set; } = "deterministic";
}
