using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Infrastructure.Persistence.Seed;

namespace StockPilot.Procurement.Infrastructure.ExternalStubs;

/// <summary>
/// Temporary stand-in for the teammate-built Branches module. Replace the registration in
/// <see cref="DependencyInjection"/> with a real client once that module exists.
/// </summary>
public class InMemoryBranchDirectoryService : IBranchDirectoryService
{
    private static readonly Dictionary<Guid, BranchInfo> Branches = new()
    {
        [SeedIds.Branch] = new BranchInfo(SeedIds.Branch, "Colombo Main Branch", true)
    };

    public Task<BranchInfo?> GetBranchAsync(Guid branchId, CancellationToken cancellationToken = default) =>
        Task.FromResult(Branches.GetValueOrDefault(branchId));
}
