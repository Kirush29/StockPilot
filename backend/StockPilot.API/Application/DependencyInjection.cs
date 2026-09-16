using Microsoft.Extensions.DependencyInjection;
using StockPilot.Application.Sales.Interfaces;
using StockPilot.Application.Sales.Services;

namespace StockPilot.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Register Sales & Demand Services (Yours)
        services.AddScoped<ISalesService, SalesService>();
        services.AddScoped<IDemandForecastService, DemandForecastService>();
        services.AddScoped<StockPilot.Application.AgenticAI.DemandForecastAgent.IDemandForecastAgent, StockPilot.Application.AgenticAI.DemandForecastAgent.DemandForecastAgent>();

        return services;
    }
}
