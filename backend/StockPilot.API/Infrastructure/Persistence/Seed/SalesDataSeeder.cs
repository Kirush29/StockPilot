using Microsoft.EntityFrameworkCore;
using StockPilot.Domain.Entities.Sales;
using StockPilot.Domain.Enums.Sales;
using StockPilot.Infrastructure.Persistence;

namespace StockPilot.Infrastructure.Persistence.Seed;

public static class SalesDataSeeder
{
    public static async Task SeedAsync(StockPilotDbContext context)
    {
        // Only seed if Sales table is empty
        if (await context.Sales.AnyAsync())
        {
            return;
        }

        var colomboBranchId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var kandyBranchId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var products = new[]
        {
            new
            {
                Id = Guid.Parse("18464716-8fa7-49da-b521-08b1dc057c28"),
                Sku = "SKU-PARACETAMOL-500",
                Name = "Paracetamol 500mg (100 Tabs)",
                Category = "Pharmaceuticals",
                Price = 24.50m,
                Cost = 14.00m,
                BaseDailyAvg = 18
            },
            new
            {
                Id = Guid.Parse("28464716-8fa7-49da-b521-08b1dc057c29"),
                Sku = "SKU-AMOXICILLIN-250",
                Name = "Amoxicillin 250mg Capsules",
                Category = "Antibiotics",
                Price = 45.00m,
                Cost = 28.00m,
                BaseDailyAvg = 12
            },
            new
            {
                Id = Guid.Parse("38464716-8fa7-49da-b521-08b1dc057c30"),
                Sku = "SKU-VITAMINC-1000",
                Name = "Vitamin C 1000mg Effervescent",
                Category = "Supplements",
                Price = 32.00m,
                Cost = 18.50m,
                BaseDailyAvg = 22
            },
            new
            {
                Id = Guid.Parse("48464716-8fa7-49da-b521-08b1dc057c31"),
                Sku = "SKU-MASKS-SURG-50",
                Name = "3-Ply Surgical Masks (Box of 50)",
                Category = "Medical Supplies",
                Price = 15.00m,
                Cost = 8.20m,
                BaseDailyAvg = 30
            }
        };

        var random = new Random(101);
        var now = DateTime.UtcNow;
        var salesToInsert = new List<Sale>();

        // Generate 60 days of historical sales
        for (int day = 60; day >= 1; day--)
        {
            var saleDate = now.AddDays(-day).Date.AddHours(9 + random.Next(10)).AddMinutes(random.Next(60));
            var branch = random.NextDouble() > 0.4 ? "Colombo Central Branch" : "Kandy City Branch";
            var branchId = branch == "Colombo Central Branch" ? colomboBranchId : kandyBranchId;

            // 2 to 4 sales per day
            var transactionsCount = random.Next(2, 5);
            for (int t = 0; t < transactionsCount; t++)
            {
                var sale = new Sale
                {
                    InvoiceNumber = $"INV-HIST-{day:D2}-{t+1:D2}",
                    BranchId = branchId,
                    BranchName = branch,
                    SaleDateUtc = saleDate.AddMinutes(t * 75),
                    PaymentMethod = random.NextDouble() > 0.5 ? PaymentMethod.Card : PaymentMethod.Cash,
                    CustomerReference = random.NextDouble() > 0.3 ? $"Customer #{random.Next(100, 999)}" : "Walk-in Customer",
                    Notes = "Historical simulated transaction"
                };

                // Pick 1 to 3 items per transaction
                var itemsCount = random.Next(1, 4);
                var pickedProducts = products.OrderBy(_ => random.Next()).Take(itemsCount);

                decimal subTotal = 0;
                decimal totalDiscount = 0;

                foreach (var prod in pickedProducts)
                {
                    // Daily quantity variance
                    var qty = Math.Max(1, (int)(prod.BaseDailyAvg / transactionsCount + (random.NextDouble() * 4 - 2)));
                    var lineTotal = qty * prod.Price;
                    var discountPct = random.NextDouble() > 0.8 ? 5.0m : 0.0m;
                    var discountAmount = lineTotal * (discountPct / 100.0m);
                    var finalTotal = lineTotal - discountAmount;

                    subTotal += lineTotal;
                    totalDiscount += discountAmount;

                    sale.Items.Add(new SaleItem
                    {
                        ProductId = prod.Id,
                        ProductSku = prod.Sku,
                        ProductName = prod.Name,
                        Category = prod.Category,
                        Quantity = qty,
                        UnitPrice = prod.Price,
                        DiscountPercent = discountPct,
                        TotalPrice = finalTotal
                    });
                }

                sale.SubTotal = subTotal;
                sale.DiscountAmount = totalDiscount;
                sale.TaxAmount = Math.Round((subTotal - totalDiscount) * 0.08m, 2); // 8% sales tax
                sale.TotalAmount = (subTotal - totalDiscount) + sale.TaxAmount;

                salesToInsert.Add(sale);
            }
        }

        context.Sales.AddRange(salesToInsert);
        await context.SaveChangesAsync();
    }
}
