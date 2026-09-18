using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfUnitOfWork(ProcurementDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => context.SaveChangesAsync(cancellationToken);

    public void Add<TEntity>(TEntity entity) where TEntity : class => context.Add(entity);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        // The in-memory provider (used for local dev without Postgres) doesn't support explicit
        // transactions; SaveChanges is already atomic there, so just run the operation directly.
        if (context.Database.IsInMemory())
        {
            await operation(cancellationToken);
            return;
        }

        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });
    }
}
