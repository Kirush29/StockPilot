using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Procurement.Infrastructure.Persistence;
using InventorySupplierDbContext = StockPilot.Infrastructure.Data.StockPilotDbContext;

namespace StockPilot.Shared.Data;

public static class PlatformPersistence
{
    public const string InMemoryDatabaseName = "StockPilotDb";

    /// <summary>
    /// Registers the one shared <see cref="AppDbContext"/> and exposes it under each module's
    /// existing context type, so every module in a request shares one context and one database connection.
    /// </summary>
    public static IServiceCollection AddPlatformPersistence(this IServiceCollection services, string? connectionString, bool useInMemory)
    {
        services.AddDbContext<AppDbContext>(options =>
        {
            if (useInMemory)
                // Inventory's services open explicit transactions; the in-memory provider has none, so it ignores them
                // (Procurement's EfUnitOfWork already skips them in this mode).
                options.UseInMemoryDatabase(InMemoryDatabaseName)
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
            else
                options.UseNpgsql(connectionString);
        });

        services.AddScoped<InventorySupplierDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<IProcurementDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        return services;
    }
}

/// <summary>
/// Used by <c>dotnet ef</c> only. Always Npgsql so migrations include PostgreSQL-only model parts
/// (xmin row versions). No connection is opened by <c>migrations add</c>.
/// Set STOCKPILOT_DESIGN_CONNECTION to run <c>database update</c> against a specific server.
/// </summary>
public class AppDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("STOCKPILOT_DESIGN_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=stockpilotdb;Username=postgres";
        return new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options);
    }
}
