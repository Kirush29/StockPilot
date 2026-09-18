using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Services;

namespace StockPilot.API.Authorization;

/// <summary>Marker requirement for the "CanApproveProcurement" policy: caller's role must permit the proposal's amount.</summary>
public class ProcurementApprovalRequirement : IAuthorizationRequirement;

/// <summary>
/// Resource-based handler backing the "CanApproveProcurement" policy. Succeeds only if the
/// caller holds a procurement-approval role whose configured limit covers the proposal's total
/// estimated cost (a null limit means unlimited, e.g. BusinessOwner).
/// </summary>
public class ProcurementApprovalHandler(IOptions<ApprovalLimitOptions> approvalLimits)
    : AuthorizationHandler<ProcurementApprovalRequirement, ProposalDetailResponse>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ProcurementApprovalRequirement requirement, ProposalDetailResponse resource)
    {
        var roles = context.User.Claims
            .Where(c => c.Type == System.Security.Claims.ClaimTypes.Role)
            .Select(c => c.Value);

        var limit = approvalLimits.Value.GetHighestLimit(roles);

        if (limit is null || resource.TotalEstimatedCost <= limit)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
