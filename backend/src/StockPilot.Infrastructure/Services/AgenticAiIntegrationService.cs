using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using StockPilot.Application.Interfaces;
using StockPilot.Application.Models;

namespace StockPilot.Infrastructure.Services;

public class AgenticAiIntegrationException : Exception
{
    public AgenticAiIntegrationException(string message) : base(message) { }
    public AgenticAiIntegrationException(string message, Exception inner) : base(message, inner) { }
}

public class AgenticAiIntegrationService : IAgenticAiIntegrationService
{
    private readonly AgenticAiSettings _settings;

    public AgenticAiIntegrationService(IOptions<AgenticAiSettings> options)
    {
        _settings = options.Value;
    }

    public async Task<SupplierEvaluationResponseDto> EvaluateCandidatesAsync(
        Guid productId, 
        IReadOnlyList<SupplierEvaluationCandidateDto> candidates)
    {
        var inputPayload = new
        {
            mode = "ai",
            productId = productId.ToString(),
            candidates = candidates
        };

        var inputJson = JsonSerializer.Serialize(inputPayload, new JsonSerializerOptions 
        { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
        });

        var resolvedWorkingDirectory = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), _settings.WorkingDirectory));

        var processInfo = new ProcessStartInfo
        {
            FileName = _settings.PythonPath,
            Arguments = _settings.EntryPoint != "src/__main__.py" ? _settings.EntryPoint : $"-m src.__main__",
            WorkingDirectory = resolvedWorkingDirectory,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = processInfo };

        try
        {
            process.Start();

            await process.StandardInput.WriteAsync(inputJson);
            process.StandardInput.Close();

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
            var exitTask = process.WaitForExitAsync(cts.Token);
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            try
            {
                await exitTask;
            }
            catch (OperationCanceledException)
            {
                if (!process.HasExited)
                {
                    process.Kill(true);
                }
                throw new AgenticAiIntegrationException($"Agentic AI process timed out after {_settings.TimeoutSeconds} seconds.");
            }

            string outputJson = await stdoutTask;
            string errorOutput = await stderrTask;

            if (process.ExitCode != 0)
            {
                throw new AgenticAiIntegrationException($"Agentic AI process failed with exit code {process.ExitCode}. Error: {errorOutput}");
            }

            if (string.IsNullOrWhiteSpace(outputJson))
            {
                throw new AgenticAiIntegrationException("Agentic AI process returned empty output.");
            }

            var result = JsonSerializer.Deserialize<SupplierEvaluationResponseDto>(outputJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null)
            {
                throw new AgenticAiIntegrationException("Failed to deserialize Agentic AI output.");
            }

            return result;
        }
        catch (Exception ex) when (ex is not AgenticAiIntegrationException)
        {
            throw new AgenticAiIntegrationException("Failed to execute Agentic AI process.", ex);
        }
    }
}
