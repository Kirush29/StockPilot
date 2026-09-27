using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Services;

public class FakeEmailNotificationService : IEmailNotificationService
{
    private readonly ILogger<FakeEmailNotificationService> _logger;

    public FakeEmailNotificationService(ILogger<FakeEmailNotificationService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("FAKE EMAIL SENDER: Would have sent email to {Recipient} with subject '{Subject}'", to, subject);

        // Simulate minor delay
        await Task.Delay(100, cancellationToken);

        return true;
    }
}
