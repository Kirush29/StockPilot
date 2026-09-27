namespace StockPilot.Application.Interfaces;

public interface IEmailNotificationService
{
    Task<bool> SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default);
}
