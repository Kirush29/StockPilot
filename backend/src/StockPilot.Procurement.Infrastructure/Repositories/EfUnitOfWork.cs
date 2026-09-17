using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Infrastructure.Persistence;

namespace StockPilot.Procurement.Infrastructure.Repositories;

public class EfUnitOfWork(ProcurementDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => context.SaveChangesAsync(cancellationToken);
}
