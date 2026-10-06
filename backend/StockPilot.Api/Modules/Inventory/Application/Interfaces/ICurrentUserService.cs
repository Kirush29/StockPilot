using System;

namespace StockPilot.Application.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Role { get; }
    Guid? BranchId { get; }
    string? Email { get; }
    string? FullName { get; }
}
