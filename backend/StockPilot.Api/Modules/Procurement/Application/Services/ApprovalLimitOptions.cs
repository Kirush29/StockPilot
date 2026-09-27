using StockPilot.Procurement.Domain.Common;

namespace StockPilot.Procurement.Application.Services;

/// <summary>
/// Maximum amount a role may approve, bound from configuration section "Procurement:ApprovalLimits".
/// A null/absent limit for a role means unlimited; a role missing entirely means it cannot approve.
/// </summary>
public class ApprovalLimitOptions
{
    public const string SectionName = "Procurement:ApprovalLimits";

    public decimal? ProcurementManager { get; set; }

    public decimal? BusinessOwner { get; set; }

    /// <summary>Returns the caller's approval limit, or null if the role cannot approve at all.</summary>
    public decimal? GetLimitForRole(string role) => role switch
    {
        ProcurementRoles.BusinessOwner => BusinessOwner,
        ProcurementRoles.ProcurementManager => ProcurementManager,
        _ => 0m
    };

    /// <summary>The highest limit across all of the caller's roles; null means unlimited. Returns null only if at least one role grants unlimited approval.</summary>
    public decimal? GetHighestLimit(IEnumerable<string> roles)
    {
        decimal? highest = 0m;
        var any = false;
        foreach (var role in roles)
        {
            if (role is not (ProcurementRoles.BusinessOwner or ProcurementRoles.ProcurementManager))
            {
                continue;
            }

            any = true;
            var limit = GetLimitForRole(role);
            if (limit is null)
            {
                return null;
            }

            if (limit > highest)
            {
                highest = limit;
            }
        }

        return any ? highest : 0m;
    }
}
