using Microsoft.Extensions.Options;
using StockPilot.Application.Models;
using StockPilot.Infrastructure.Services;
using Xunit;

namespace StockPilot.Api.Tests;

public class AgenticAiIntegrationServiceTests
{
    private IOptions<AgenticAiSettings> CreateSettings(string entryPoint, int timeoutSeconds = 5)
    {
        return Options.Create(new AgenticAiSettings
        {
            PythonPath = "python",
            WorkingDirectory = ".",
            EntryPoint = entryPoint,
            TimeoutSeconds = timeoutSeconds
        });
    }

    [Fact]
    public async Task EvaluateCandidatesAsync_ReturnsDto_WhenProcessSucceeds()
    {
        // Arrange
        var entryPoint = "-c \"import sys; print('{\\\"decisionStatus\\\": \\\"PendingHumanApproval\\\", \\\"humanApprovalRequired\\\": true}')\"";
        var options = CreateSettings(entryPoint);
        var service = new AgenticAiIntegrationService(options);
        var candidates = new List<SupplierEvaluationCandidateDto>();

        // Act
        var result = await service.EvaluateCandidatesAsync(Guid.NewGuid(), candidates);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("PendingHumanApproval", result.DecisionStatus);
        Assert.True(result.HumanApprovalRequired);
    }

    [Fact]
    public async Task EvaluateCandidatesAsync_ThrowsException_WhenProcessFailsWithNonZeroExitCode()
    {
        // Arrange
        var entryPoint = "-c \"import sys; sys.stderr.write('Simulated Error'); sys.exit(1)\"";
        var options = CreateSettings(entryPoint);
        var service = new AgenticAiIntegrationService(options);
        var candidates = new List<SupplierEvaluationCandidateDto>();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AgenticAiIntegrationException>(() => 
            service.EvaluateCandidatesAsync(Guid.NewGuid(), candidates));
        
        Assert.Contains("exit code 1", ex.Message);
        Assert.Contains("Simulated Error", ex.Message);
    }

    [Fact]
    public async Task EvaluateCandidatesAsync_ThrowsException_WhenProcessTimesOut()
    {
        // Arrange
        var entryPoint = "-c \"import time; time.sleep(10)\"";
        var options = CreateSettings(entryPoint, timeoutSeconds: 1);
        var service = new AgenticAiIntegrationService(options);
        var candidates = new List<SupplierEvaluationCandidateDto>();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AgenticAiIntegrationException>(() => 
            service.EvaluateCandidatesAsync(Guid.NewGuid(), candidates));
        
        Assert.Contains("timed out", ex.Message);
    }

    [Fact]
    public async Task EvaluateCandidatesAsync_ThrowsException_WhenProcessOutputIsInvalidJson()
    {
        // Arrange
        var entryPoint = "-c \"import sys; print('Not JSON')\"";
        var options = CreateSettings(entryPoint);
        var service = new AgenticAiIntegrationService(options);
        var candidates = new List<SupplierEvaluationCandidateDto>();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AgenticAiIntegrationException>(() => 
            service.EvaluateCandidatesAsync(Guid.NewGuid(), candidates));
        
        // Ensure inner exception is JSON-related
        Assert.Contains("Failed to execute", ex.Message);
        Assert.NotNull(ex.InnerException);
        Assert.IsAssignableFrom<System.Text.Json.JsonException>(ex.InnerException);
    }
}
