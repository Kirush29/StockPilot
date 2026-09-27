using Npgsql;

namespace StockPilot.Procurement.Infrastructure.Connection;

/// <summary>
/// Converts the <c>postgresql://user:password@host:port/db</c> URL format used by
/// <c>.env.example</c>'s <c>DATABASE_URL</c> into an ADO.NET connection string Npgsql understands.
/// </summary>
public static class DatabaseUrlParser
{
    public static string ToNpgsqlConnectionString(string databaseUrl)
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty
        };

        return builder.ConnectionString;
    }
}
