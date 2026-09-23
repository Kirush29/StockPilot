using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Infrastructure.Repositories;

public class QuotationRepository : IQuotationRepository
{
    private readonly StockPilotDbContext _dbContext;

    public QuotationRepository(StockPilotDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Quotation?> GetByIdAsync(Guid id)
    {
        return await _dbContext.Quotations
            .AsNoTracking()
            .FirstOrDefaultAsync(quotation => quotation.Id == id);
    }

    public async Task<IReadOnlyList<Quotation>> GetAllAsync()
    {
        return await _dbContext.Quotations
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task AddAsync(Quotation quotation)
    {
        await _dbContext.Quotations.AddAsync(quotation);
        await _dbContext.SaveChangesAsync();
    }
    public async Task UpdateAsync(Quotation quotation)
    {
        _dbContext.Quotations.Update(quotation);
        await _dbContext.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<Quotation>> GetByProductIdAsync(Guid productId)
    {
        return await _dbContext.Quotations
            .AsNoTracking()
            .Where(q => q.ProductId == productId)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Quotation>> GetBySupplierIdAsync(Guid supplierId)
    {
        return await _dbContext.Quotations
            .AsNoTracking()
            .Where(q => q.SupplierId == supplierId)
            .ToListAsync();
    }
}
