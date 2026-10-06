using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using StockPilot.Api.Configuration;
using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Services;

public class SmtpEmailNotificationService : IEmailNotificationService, IDisposable
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailNotificationService> _logger;
    private readonly SmtpClient _smtpClient;

    public SmtpEmailNotificationService(IOptions<EmailSettings> options, ILogger<SmtpEmailNotificationService> logger)
    {
        _settings = options.Value;
        _logger = logger;

        _smtpClient = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
        {
            Credentials = new NetworkCredential(_settings.SmtpUsername, _settings.SmtpPassword),
            EnableSsl = true
        };
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10)); // 10s timeout

            var message = new MailMessage
            {
                From = new MailAddress(_settings.FromAddress, _settings.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(to);

            _logger.LogInformation("Attempting to send email to {Recipient} with subject '{Subject}'", to, subject);

            // SmtpClient doesn't directly support CancellationToken in SendMailAsync prior to .NET 8 (with extensions),
            // but we can register cancellation to abort.
            await using var registration = cts.Token.Register(() => _smtpClient.SendAsyncCancel());

            await _smtpClient.SendMailAsync(message, cts.Token);
            _logger.LogInformation("Successfully sent email to {Recipient}", to);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Email sending to {Recipient} was cancelled or timed out.", to);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipient}. Reason: {Message}", to, ex.Message);
            return false;
        }
    }

    public void Dispose()
    {
        _smtpClient.Dispose();
        GC.SuppressFinalize(this);
    }
}
