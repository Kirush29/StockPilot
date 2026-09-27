using Microsoft.Extensions.Logging;
using Moq;
using StockPilot.Api.Services;
using Xunit;

namespace StockPilot.Api.Tests;

public class EmailNotificationServiceTests
{
    [Fact]
    public async Task FakeEmailNotificationService_ShouldReturnTrueAndLogMessage()
    {
        // Arrange
        var loggerMock = new Mock<ILogger<FakeEmailNotificationService>>();
        var service = new FakeEmailNotificationService(loggerMock.Object);

        // Act
        var result = await service.SendEmailAsync("test@example.com", "Test Subject", "Test Body");

        // Assert
        Assert.True(result);
    }
}
