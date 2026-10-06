using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Infrastructure.Services;
using StockPilot.Shared.Integration;
using StockPilot.Shared.Data;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Domain.Entities;
using Xunit;

namespace StockPilot.Api.Tests;

/// <summary>D14: receiving a purchase order creates an Inventory batch through Student 1's real BatchService.</summary>
public class InventoryStockReceivingAdapterTests
{
    private static readonly Guid Branch = Guid.NewGuid();
    private static readonly Guid OtherBranch = Guid.NewGuid();
    private static readonly Guid Product = Guid.NewGuid();
    private static readonly Guid Order = Guid.NewGuid();

    private static AppDbContext NewDb()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);
        db.Branches.Add(new Branch { BranchId = Branch, BranchCode = "COL", Name = "Colombo", IsActive = true });
        db.Products.Add(new Product { Id = Product, SKU = "SKU-1", Name = "Paracetamol", IsActive = true });
        db.Inventories.Add(new Inventory { InventoryId = Guid.NewGuid(), BranchId = Branch, ProductId = Product, QuantityOnHand = 40 });
        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = Order,
            ProposalId = Guid.NewGuid(),
            SupplierId = Guid.NewGuid(),
            OrderNumber = "PO-2026-000007",
            LineItems = [new PurchaseOrderLineItem { Id = Guid.NewGuid(), PurchaseOrderId = Order, ProductId = Product, Quantity = 293, UnitPrice = 14.20m }]
        });
        db.SaveChanges();
        db.ChangeTracker.Clear();
        return db;
    }

    private static InventoryStockReceivingAdapter NewAdapter(AppDbContext db, string role = "ProcurementManager", Guid? userBranch = null)
    {
        var user = new Mock<ICurrentUserService>();
        user.Setup(u => u.UserId).Returns(Guid.NewGuid());
        user.Setup(u => u.Role).Returns(role);
        user.Setup(u => u.BranchId).Returns(userBranch);
        return new InventoryStockReceivingAdapter(new BatchService(db, user.Object), db, db, user.Object);
    }

    [Fact]
    public async Task Receiving_CreatesBatch_AndIncreasesStock()
    {
        using var db = NewDb();

        await NewAdapter(db).NotifyStockReceivedAsync(Branch, Product, 293, Order);

        var batch = await db.Batches.SingleAsync();
        Assert.Equal("PO-2026-000007-L1", batch.BatchNumber);
        Assert.Equal(293, batch.Quantity);
        Assert.Equal(14.20m, batch.UnitCost);
        Assert.Null(batch.ExpiryDate);
        Assert.Equal(333, (await db.Inventories.SingleAsync()).QuantityOnHand);
    }

    [Fact]
    public async Task Receiving_Twice_DoesNotDoubleCountStock()
    {
        using var db = NewDb();
        var adapter = NewAdapter(db);

        await adapter.NotifyStockReceivedAsync(Branch, Product, 293, Order);
        await adapter.NotifyStockReceivedAsync(Branch, Product, 293, Order);

        Assert.Single(await db.Batches.ToListAsync());
        Assert.Equal(333, (await db.Inventories.SingleAsync()).QuantityOnHand);
    }

    [Fact]
    public async Task BranchManagerOfAnotherBranch_IsForbidden_ByInventoryRules()
    {
        using var db = NewDb();

        await Assert.ThrowsAsync<ProcurementForbiddenException>(() =>
            NewAdapter(db, "BranchManager", OtherBranch).NotifyStockReceivedAsync(Branch, Product, 293, Order));
        Assert.Empty(await db.Batches.ToListAsync());
    }

    [Fact]
    public async Task ProductNotOnOrder_IsAValidationError()
    {
        using var db = NewDb();

        await Assert.ThrowsAsync<ProcurementValidationException>(() =>
            NewAdapter(db).NotifyStockReceivedAsync(Branch, Guid.NewGuid(), 5, Order));
    }
}
