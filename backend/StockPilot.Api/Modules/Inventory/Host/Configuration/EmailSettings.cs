namespace StockPilot.Api.Configuration;

public class EmailSettings
{
    public const string SectionName = "Email";

    public bool UseFakeProvider { get; set; } = true;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string FromAddress { get; set; } = "noreply@stockpilot.local";
    public string FromName { get; set; } = "StockPilot System";
}
