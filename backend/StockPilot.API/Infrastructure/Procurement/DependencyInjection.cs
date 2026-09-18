using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Infrastructure.Connection;
using StockPilot.Procurement.Infrastructure.ExternalStubs;
using StockPilot.Procurement.Infrastructure.Persistence;
using StockPilot.Procurement.Infrastructure.Repositories;

namespace StockPilot.Procurement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddProcurementInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);
        var hasValidConnectionString = !string.IsNullOrWhiteSpace(connectionString);
        var useInMemory = !hasValidConnectionString ||
                          (bool.TryParse(configuration["UseInMemoryDatabase"], out var inMem) && inMem) ||
                          string.Equals(Environment.GetEnvironmentVariable("USE_IN_MEMORY"), "true", StringComparison.OrdinalIgnoreCase);

        services.AddDbContext<ProcurementDbContext>(options =>
        {
            if (useInMemory)
            {
                options.UseInMemoryDatabase("StockPilotProcurementDb");
            }
            else
            {
                options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "procurement"));
            }
        });

        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        services.AddScoped<IProposalRepository, EfProposalRepository>();
        services.AddScoped<IPurchaseOrderRepository, EfPurchaseOrderRepository>();
        services.AddScoped<IBudgetRepository, EfBudgetRepository>();

        // Stand-ins for teammates' modules. Swap each for a real implementation once that
        // module exists — the interfaces in StockPilot.Procurement.Application are the contract.
        services.AddSingleton<IProductCatalogService, InMemoryProductCatalogService>();
        services.AddSingleton<ISupplierDirectoryService, InMemorySupplierDirectoryService>();
        services.AddSingleton<IBranchDirectoryService, InMemoryBranchDirectoryService>();
        services.AddSingleton<IInventoryStockUpdater, NoOpInventoryStockUpdater>();

        return services;
    }

    public static string? ResolveConnectionString(IConfiguration configuration)
    {
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            return DatabaseUrlParser.ToNpgsqlConnectionString(databaseUrl);
        }

        return configuration.GetConnectionString("DefaultConnection");
    }
}
