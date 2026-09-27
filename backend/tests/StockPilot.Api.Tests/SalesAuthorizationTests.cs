using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using StockPilot.Api.Controllers;
using Xunit;

namespace StockPilot.Api.Tests;

/// <summary>D13: Sales &amp; Demand endpoints need login; running a forecast or agent needs a planning role.</summary>
public class SalesAuthorizationTests
{
    private const string PlanningRoles = "BranchManager,ProcurementManager,BusinessOwner";

    private static readonly (Type Controller, string Action)[] Runs =
    [
        (typeof(AgentWorkflowController), nameof(AgentWorkflowController.RunDemandForecastAgent)),
        (typeof(AgentWorkflowController), nameof(AgentWorkflowController.EvaluateGoldenCases)),
        (typeof(DemandForecastController), nameof(DemandForecastController.GenerateForecast)),
    ];

    [Theory]
    [InlineData(typeof(AgentWorkflowController))]
    [InlineData(typeof(DemandForecastController))]
    [InlineData(typeof(SalesController))]
    public void EveryEndpoint_RequiresLogin_AndOnlyForecastRunsNeedAPlanningRole(Type controller)
    {
        Assert.NotNull(controller.GetCustomAttribute<AuthorizeAttribute>());
        Assert.Empty(controller.GetCustomAttributes<AllowAnonymousAttribute>());

        var actions = controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(m => m.GetCustomAttributes<HttpMethodAttribute>().Any());
        foreach (var action in actions)
        {
            Assert.Null(action.GetCustomAttribute<AllowAnonymousAttribute>());
            var roles = action.GetCustomAttributes<AuthorizeAttribute>().Select(a => a.Roles).SingleOrDefault();
            var isRun = Runs.Contains((controller, action.Name));
            Assert.Equal(isRun ? PlanningRoles : null, roles);
        }
    }

    [Fact]
    public void RecordingAPosSale_NeedsLoginOnly()
    {
        var createSale = typeof(SalesController).GetMethod(nameof(SalesController.CreateSale))!;
        Assert.NotNull(createSale.GetCustomAttribute<HttpPostAttribute>());
        Assert.Empty(createSale.GetCustomAttributes<AuthorizeAttribute>());
    }
}
