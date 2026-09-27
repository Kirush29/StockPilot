namespace StockPilot.Procurement.Application.Abstractions;

/// <summary>Read-only view of a branch, as owned by the (teammate-built) Branches module.</summary>
public record BranchInfo(Guid Id, string Name, bool IsActive);

/// <summary>
/// Contract for branch data owned by the Branches module. Implemented for real once that
/// module exists; a stub in-memory implementation is registered by default.
/// </summary>
public interface IBranchDirectoryService
{
    Task<BranchInfo?> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default);
}
