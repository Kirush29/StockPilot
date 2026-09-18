namespace StockPilot.Procurement.Application.Repositories;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Registers a newly created child entity (e.g. an audit/history row appended to an
    /// already-loaded aggregate) as an insert. Required in addition to adding it to the parent's
    /// navigation collection: because these entities have client-generated (Guid) keys, change
    /// tracking on an already-tracked parent cannot tell a brand-new child apart from an existing
    /// one and would otherwise emit an UPDATE for a row that doesn't exist yet.
    /// </summary>
    void Add<TEntity>(TEntity entity) where TEntity : class;

    /// <summary>
    /// Runs <paramref name="operation"/> and its <see cref="SaveChangesAsync"/> call(s) inside a
    /// single database transaction, so a multi-step write (e.g. decision -> status change ->
    /// budget update) commits or rolls back atomically. Wraps Npgsql's execution strategy, so the
    /// whole operation may be retried on a transient failure — keep it free of non-idempotent
    /// side effects (external calls, etc.).
    /// </summary>
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
