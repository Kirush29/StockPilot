namespace StockPilot.Procurement.Application.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Runs <paramref name="operation"/> and its <see cref="SaveChangesAsync"/> call(s) inside a
    /// single database transaction, so a multi-step write (e.g. decision -> status change ->
    /// budget update) commits or rolls back atomically. Wraps Npgsql's execution strategy, so the
    /// whole operation may be retried on a transient failure — keep it free of non-idempotent
    /// side effects (external calls, etc.).
    /// </summary>
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
