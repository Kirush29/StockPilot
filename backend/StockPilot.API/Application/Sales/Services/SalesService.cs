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

    public async Task<List<SaleDto>> GetSalesAsync(Guid? branchId, DateTime? startDate, DateTime? endDate, int? paymentMethod = null, int take = 50, CancellationToken cancellationToken = default)
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

        if (paymentMethod.HasValue && paymentMethod.Value > 0)
        {
            query = query.Where(s => s.PaymentMethod == (StockPilot.Domain.Enums.Sales.PaymentMethod)paymentMethod.Value);
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

        // All product item groupings
        var allProductGroups = sales.SelectMany(s => s.Items)
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
            .ToList();

        // 1. Top Selling Products
        result.TopSellingProducts = allProductGroups
            .OrderByDescending(p => p.UnitsSold)
            .Take(5)
            .ToList();

        // 2. Slow Moving Products (Bottom 5 by units sold)
        result.SlowMovingProducts = allProductGroups
            .OrderBy(p => p.UnitsSold)
            .Take(5)
            .ToList();

        // 3. Daily Trends with Demand Spikes
        var dailyList = sales
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

        if (dailyList.Count > 2)
        {
            var avgRevenue = (double)dailyList.Average(d => d.TotalRevenue);
            var variance = dailyList.Average(d => Math.Pow((double)d.TotalRevenue - avgRevenue, 2));
            var stdDev = Math.Sqrt(variance);
            var spikeThreshold = (decimal)(avgRevenue + (1.3 * stdDev));

            foreach (var day in dailyList)
            {
                day.IsSpike = day.TotalRevenue >= spikeThreshold;
            }
        }
        result.DailyTrends = dailyList;

        // 4. Category breakdown
        var totalCatRevenue = sales.SelectMany(s => s.Items).Sum(i => i.TotalPrice);
        if (totalCatRevenue > 0)
        {
            result.CategoryShares = sales.SelectMany(s => s.Items)
                .GroupBy(i => string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category)
                .Select(g => new CategorySalesShareDto
                {
                    Category = g.Key,
                    Revenue = g.Sum(x => x.TotalPrice),
                    UnitsSold = g.Sum(x => x.Quantity),
                    Percentage = (double)Math.Round((g.Sum(x => x.TotalPrice) / totalCatRevenue) * 100, 1)
                })
                .OrderByDescending(c => c.Revenue)
                .ToList();
        }

        // 5. Branch comparison
        if (result.TotalRevenue > 0)
        {
            result.BranchComparisons = sales
                .GroupBy(s => new { s.BranchId, s.BranchName })
                .Select(g => new BranchSalesComparisonDto
                {
                    BranchId = g.Key.BranchId,
                    BranchName = g.Key.BranchName,
                    Revenue = g.Sum(s => s.TotalAmount),
                    UnitsSold = g.SelectMany(s => s.Items).Sum(i => i.Quantity),
                    OrderCount = g.Count(),
                    PercentageOfTotal = (double)Math.Round((g.Sum(s => s.TotalAmount) / result.TotalRevenue) * 100, 1)
                })
                .OrderByDescending(b => b.Revenue)
                .ToList();
        }

        // 6. Day of week seasonal patterns (Sunday = 0 to Saturday = 6)
        var dayNames = new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
        var dayGroups = sales
            .GroupBy(s => (int)s.SaleDateUtc.DayOfWeek)
            .ToDictionary(g => g.Key, g => g.ToList());

        result.DayOfWeekPatterns = Enumerable.Range(0, 7).Select(i =>
        {
            var daySales = dayGroups.ContainsKey(i) ? dayGroups[i] : new List<Sale>();
            var uniqueDates = daySales.Select(s => s.SaleDateUtc.Date).Distinct().Count();
            var divisor = uniqueDates > 0 ? (decimal)uniqueDates : 1m;
            return new DayOfWeekPatternDto
            {
                DayIndex = i,
                DayName = dayNames[i],
                TotalDaysObserved = uniqueDates,
                AverageQuantity = Math.Round(daySales.SelectMany(s => s.Items).Sum(x => x.Quantity) / divisor, 1),
                AverageRevenue = Math.Round(daySales.Sum(s => s.TotalAmount) / divisor, 2)
            };
        }).ToList();

        // 7. Customer behavior (Top 5 customers, repeat rate, frequent co-purchases)
        var customerGroups = sales
            .Where(s => !string.IsNullOrWhiteSpace(s.CustomerReference))
            .GroupBy(s => s.CustomerReference!)
            .ToList();

        var topCustomers = customerGroups
            .Select(g => new TopCustomerDto
            {
                CustomerReference = g.Key,
                OrderCount = g.Count(),
                TotalSpend = g.Sum(s => s.TotalAmount),
                LastPurchaseDateUtc = g.Max(s => s.SaleDateUtc)
            })
            .OrderByDescending(c => c.TotalSpend)
            .Take(5)
            .ToList();

        var repeatCustomersCount = customerGroups.Count(g => g.Count() > 1);
        var repeatRate = customerGroups.Count > 0 
            ? (double)Math.Round(((double)repeatCustomersCount / customerGroups.Count) * 100, 1) 
            : 0;

        // Frequent item pairs (Products often bought together)
        var coPurchases = new Dictionary<(string SkuA, string NameA, string SkuB, string NameB), int>();
        foreach (var sale in sales)
        {
            var distinctItems = sale.Items
                .GroupBy(i => new { i.ProductSku, i.ProductName })
                .Select(g => g.Key)
                .OrderBy(x => x.ProductSku)
                .ToList();

            for (int a = 0; a < distinctItems.Count; a++)
            {
                for (int b = a + 1; b < distinctItems.Count; b++)
                {
                    var key = (distinctItems[a].ProductSku, distinctItems[a].ProductName, distinctItems[b].ProductSku, distinctItems[b].ProductName);
                    coPurchases[key] = coPurchases.GetValueOrDefault(key, 0) + 1;
                }
            }
        }

        var coPurchasedList = coPurchases
            .OrderByDescending(kv => kv.Value)
            .Take(4)
            .Select(kv => new CoPurchasedItemDto
            {
                PrimaryProductSku = kv.Key.SkuA,
                PrimaryProductName = kv.Key.NameA,
                SecondaryProductSku = kv.Key.SkuB,
                SecondaryProductName = kv.Key.NameB,
                CoOccurrenceCount = kv.Value
            })
            .ToList();

        result.CustomerBehavior = new CustomerBehaviorSummaryDto
        {
            TopCustomers = topCustomers,
            RepeatCustomerRate = repeatRate,
            TotalUniqueCustomers = customerGroups.Count,
            ProductsBoughtTogether = coPurchasedList
        };

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
