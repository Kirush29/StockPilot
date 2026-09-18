using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.Procurement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddProcurementApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddValidatorsFromAssemblyContaining(typeof(DependencyInjection));

        services.Configure<ApprovalLimitOptions>(configuration.GetSection(ApprovalLimitOptions.SectionName));

        services.AddScoped<IProcurementProposalService, ProcurementProposalService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<IBudgetService, BudgetService>();

        return services;
    }
}
