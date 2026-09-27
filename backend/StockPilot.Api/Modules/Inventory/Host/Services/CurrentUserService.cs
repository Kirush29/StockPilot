using System.Security.Claims;
using StockPilot.Application.Interfaces;

namespace StockPilot.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return null;

            var userIdString = user.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                            ?? user.FindFirstValue("userId");

            if (Guid.TryParse(userIdString, out var userId) && userId != Guid.Empty)
                return userId;

            return null;
        }
    }

    public string? Role
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return null;

            return user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");
        }
    }

    public Guid? BranchId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return null;

            var branchIdString = user.FindFirstValue("branchId")
                              ?? user.FindFirstValue("BranchId");

            if (Guid.TryParse(branchIdString, out var branchId) && branchId != Guid.Empty)
                return branchId;

            return null;
        }
    }

    public string? Email
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return null;

            return user.FindFirstValue(ClaimTypes.Email)
                ?? user.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email);
        }
    }

    public string? FullName
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return null;

            return user.FindFirstValue("name")
                ?? user.FindFirstValue(ClaimTypes.Name);
        }
    }
}
