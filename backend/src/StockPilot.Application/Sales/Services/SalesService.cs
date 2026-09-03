using Microsoft.EntityFrameworkCore;
using StockPilot.Application.Common.Interfaces;
using StockPilot.Application.Sales.DTOs;
using StockPilot.Application.Sales.Interfaces;
using StockPilot.Domain.Entities.Sales;

namespace StockPilot.Application.Sales.Services;

public class SalesService : ISalesService
{
    private readonly IApplicationDbContext _context;

    public SalesService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SaleDto> CreateSaleAsync(CreateSaleDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Items == null || dto.Items.Count == 0)
        {
            throw new ArgumentException("A sale must contain at least one item.");
        }

        var sale = new Sale
        {
            BranchId = dto.BranchId != Guid.Empty ? dto.BranchId : Guid.NewGuid(),
            BranchName = string.IsNullOrWhiteSpace(dto.BranchName) ? "Main Branch" : dto.BranchName,
            InvoiceNumber = GenerateInvoiceNumber(),
            SaleDateUtc = DateTime.UtcNow,
            PaymentMethod = dto.PaymentMethod,
            CustomerReference = dto.CustomerReference,
            Notes = dto.Notes
        };

        decimal subtotal = 0;
        decimal totalDiscount = 0;

        foreach (var itemDto in dto.Items)
        {
            if (itemDto.Quantity <= 0)
            {
                throw new ArgumentException($"Quantity for item {itemDto.ProductName} must be greater than zero.");
            }

            var itemDiscount = (itemDto.Quantity * itemDto.UnitPrice) * (itemDto.DiscountPercent / 100m);
            var itemTotal = (itemDto.Quantity * itemDto.UnitPrice) - itemDiscount;

            subtotal += itemDto.Quantity * itemDto.UnitPrice;
            totalDiscount += itemDiscount;

            sale.Items.Add(new SaleItem
            {
                ProductId = itemDto.ProductId != Guid.Empty ? itemDto.ProductId : Guid.NewGuid(),
                ProductSku = itemDto.ProductSku,
                ProductName = itemDto.ProductName,
                Category = string.IsNullOrWhiteSpace(itemDto.Category) ? "General" : itemDto.Category,
                Quantity = itemDto.Quantity,
                UnitPrice = itemDto.UnitPrice,
                DiscountPercent = itemDto.DiscountPercent,
                TotalPrice = itemTotal
            });
        }

        sale.SubTotal = subtotal;
        sale.DiscountAmount = totalDiscount;
        sale.TaxAmount = Math.Round((subtotal - totalDiscount) * 0.05m, 2); // 5% Standard tax
        sale.TotalAmount = (sale.SubTotal - sale.DiscountAmount) + sale.TaxAmount;

        _context.Sales.Add(sale);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(sale);
    }

    public async Task<List<SaleDto>> GetSalesAsync(Guid? branchId, DateTime? startDate, DateTime? endDate, int take = 50, CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .Include(s => s.Items)
            .AsNoTracking()
            .AsQueryable();

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(s => s.BranchId == branchId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.SaleDateUtc >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(s => s.SaleDateUtc <= endDate.Value);
        }

        var sales = await query
            .OrderByDescending(s => s.SaleDateUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        return sales.Select(MapToDto).ToList();
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        return sale != null ? MapToDto(sale) : null;
    }

    public async Task<SalesAnalyticsSummaryDto> GetSalesAnalyticsAsync(Guid? branchId, int days = 30, CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-days);

        var query = _context.Sales
            .Include(s => s.Items)
            .AsNoTracking()
            .Where(s => s.SaleDateUtc >= cutoff);

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(s => s.BranchId == branchId.Value);
        }

        var sales = await query.ToListAsync(cancellationToken);

        var result = new SalesAnalyticsSummaryDto
        {
            TotalRevenue = sales.Sum(s => s.TotalAmount),
            TotalTransactions = sales.Count,
            TotalUnitsSold = sales.SelectMany(s => s.Items).Sum(i => i.Quantity),
            AverageOrderValue = sales.Count > 0 ? Math.Round(sales.Average(s => s.TotalAmount), 2) : 0
        };

        // Top Selling Products
        result.TopSellingProducts = sales.SelectMany(s => s.Items)
            .GroupBy(i => new { i.ProductId, i.ProductSku, i.ProductName })
            .Select(g => new TopSellingProductDto
            {
                ProductId = g.Key.ProductId,
                ProductSku = g.Key.ProductSku,
                ProductName = g.Key.ProductName,
                UnitsSold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice),
                VelocityCategory = g.Sum(x => x.Quantity) > 50 ? "Fast" : g.Sum(x => x.Quantity) > 15 ? "Medium" : "Slow"
            })
            .OrderByDescending(p => p.UnitsSold)
            .Take(5)
            .ToList();

        // Daily Trends
        result.DailyTrends = sales
            .GroupBy(s => s.SaleDateUtc.Date)
            .Select(g => new DailySalesTrendDto
            {
                Date = g.Key,
                TotalRevenue = g.Sum(x => x.TotalAmount),
                TotalQuantity = g.SelectMany(x => x.Items).Sum(i => i.Quantity),
                OrderCount = g.Count()
            })
            .OrderBy(d => d.Date)
            .ToList();

        // Category breakdown
        var totalCatRevenue = sales.SelectMany(s => s.Items).Sum(i => i.TotalPrice);
        if (totalCatRevenue > 0)
        {
            result.CategoryShares = sales.SelectMany(s => s.Items)
                .GroupBy(i => string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category)
                .Select(g => new CategorySalesShareDto
                {
                    Category = g.Key,
                    Revenue = g.Sum(x => x.TotalPrice),
                    Percentage = (double)Math.Round((g.Sum(x => x.TotalPrice) / totalCatRevenue) * 100, 1)
                })
                .OrderByDescending(c => c.Revenue)
                .ToList();
        }

        return result;
    }

    private static string GenerateInvoiceNumber()
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var rand = new Random().Next(100, 999);
        return $"INV-{timestamp}-{rand}";
    }

    private static SaleDto MapToDto(Sale sale)
    {
        return new SaleDto
        {
            Id = sale.Id,
            InvoiceNumber = sale.InvoiceNumber,
            BranchId = sale.BranchId,
            BranchName = sale.BranchName,
            SaleDateUtc = sale.SaleDateUtc,
            PaymentMethod = sale.PaymentMethod,
            SubTotal = sale.SubTotal,
            TaxAmount = sale.TaxAmount,
            DiscountAmount = sale.DiscountAmount,
            TotalAmount = sale.TotalAmount,
            CustomerReference = sale.CustomerReference,
            Notes = sale.Notes,
            Items = sale.Items.Select(i => new SaleItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductSku = i.ProductSku,
                ProductName = i.ProductName,
                Category = i.Category,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DiscountPercent = i.DiscountPercent,
                TotalPrice = i.TotalPrice
            }).ToList()
        };
    }
}
