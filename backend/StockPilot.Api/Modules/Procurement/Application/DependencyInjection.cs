using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StockPilot.Application.AgenticAI.ProcurementCoordinator;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Narrative;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tooling;
using StockPilot.Application.AgenticAI.ProcurementCoordinator.Tools;
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
        services.AddScoped<IProcurementBusinessRuleService, ProcurementBusinessRuleService>();

        // Procurement Coordinator Agent. Only the three tools below are allow-listed (see AgentToolGateway.AllowedTools).
        services.Configure<ProcurementAgentOptions>(configuration.GetSection(ProcurementAgentOptions.SectionName));
        services.AddSingleton<IAgentSchemaValidator, EmbeddedAgentSchemaValidator>();
        services.AddScoped<IProcurementAgentTool, CheckBudgetTool>();
        services.AddScoped<IProcurementAgentTool, ValidateBusinessRulesTool>();
        services.AddScoped<IProcurementAgentTool, CreateProposalTool>();
        services.AddScoped<AgentToolGateway>();
        services.AddScoped<IProposalJustificationWriter, ProposalJustificationWriter>();
        services.AddScoped<IAgentWorkflowTraceStore, EfAgentWorkflowTraceStore>();
        services.AddScoped<IProcurementCoordinatorAgent, ProcurementCoordinatorAgent>();

        return services;
    }
}
