namespace StockPilot.Procurement.Application.Abstractions;

/// <summary>
/// The authenticated caller, as resolved from the JWT issued by the (teammate-built) shared
/// Identity module. Implemented in the API layer by reading <c>HttpContext.User</c> claims.
/// </summary>
public interface ICurrentUserService
{
    Guid UserId { get; }

    IReadOnlyCollection<string> Roles { get; }

    bool IsInRole(string role);
}
