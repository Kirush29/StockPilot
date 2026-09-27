using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace StockPilot.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Sales & Demand persistence is the shared AppDbContext (D2), registered by
        // AddPlatformPersistence and exposed to this module as IApplicationDbContext.
        return services;
    }
}

