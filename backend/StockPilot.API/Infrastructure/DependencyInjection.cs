using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Infrastructure.Persistence;

namespace StockPilot.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["DATABASE_URL"]
            ?? Environment.GetEnvironmentVariable("DATABASE_URL");

        var hasValidConnectionString = !string.IsNullOrWhiteSpace(connectionString)
            && !connectionString.Contains("See appsettings", StringComparison.OrdinalIgnoreCase)
            && !connectionString.Contains("environment variable", StringComparison.OrdinalIgnoreCase);

        var useInMemory = !hasValidConnectionString ||
                          (bool.TryParse(configuration["UseInMemoryDatabase"], out var inMem) && inMem) ||
                          string.Equals(Environment.GetEnvironmentVariable("USE_IN_MEMORY"), "true", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<StockPilotDbContext>(options =>
        {
            if (useInMemory)
            {
                options.UseInMemoryDatabase("StockPilotDb");
            }
            else
            {
                options.UseNpgsql(connectionString);
            }
        });

        services.AddScoped<IApplicationDbContext>(provider => 
            provider.GetRequiredService<StockPilotDbContext>());

        return services;
    }
}

