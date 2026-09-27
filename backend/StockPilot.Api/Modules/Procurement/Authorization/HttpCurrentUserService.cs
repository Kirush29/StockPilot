using System.Security.Claims;
using StockPilot.Procurement.Application.Abstractions;

namespace StockPilot.API.Authorization;

/// <summary>
/// Resolves the authenticated caller from the claims on the JWT issued by the shared Identity
/// module. Expects a NameIdentifier (or "sub") claim for the user id and Role claims for roles.
/// </summary>
public class HttpCurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public Guid UserId
    {
        get
        {
            var raw = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
        }
    }

    public IReadOnlyCollection<string> Roles =>
        User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray() ?? [];

    public bool IsInRole(string role) => User?.IsInRole(role) ?? false;
}
