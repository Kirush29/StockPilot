using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfUnitOfWork(ProcurementDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => context.SaveChangesAsync(cancellationToken);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }
}
