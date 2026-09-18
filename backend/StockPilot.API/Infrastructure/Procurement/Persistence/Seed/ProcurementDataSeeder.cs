using Microsoft.EntityFrameworkCore;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Infrastructure.Persistence.Seed;

/// <summary>
/// Deterministic first-run demo data: one Budget, three ProcurementProposals spanning different
/// statuses, and one completed PurchaseOrder. Ids come from <see cref="SeedIds"/> so they stay
/// stable across migrations and match the in-memory Products/Suppliers/Branches stubs.
/// </summary>
public static class ProcurementDataSeeder
{
    public static void Seed(ModelBuilder builder)
    {
        var ts = SeedIds.SeedTimestamp;

        builder.Entity<Budget>().HasData(new Budget
        {
            Id = SeedIds.Budget,
            BranchId = SeedIds.Branch,
            PeriodStart = new DateOnly(2026, 1, 1),
            PeriodEnd = new DateOnly(2026, 12, 31),
            AllocatedAmount = 500_000m,
            SpentAmount = 6_000m,
            CreatedAt = ts,
            UpdatedAt = ts
        });

        builder.Entity<ProcurementProposal>().HasData(
            new ProcurementProposal
            {
                Id = SeedIds.ProposalDraft,
                BranchId = SeedIds.Branch,
                SupplierId = SeedIds.Supplier,
                QuotationId = null,
                CreatedByUserId = SeedIds.UserBranchManager,
                CreatedByAgent = false,
                Status = ProposalStatus.Draft,
                TotalEstimatedCost = 30_000m,
                Justification = "Replace worn office chairs at the branch.",
                CreatedAt = ts,
                UpdatedAt = ts
            },
            new ProcurementProposal
            {
                Id = SeedIds.ProposalPendingApproval,
                BranchId = SeedIds.Branch,
                SupplierId = SeedIds.Supplier,
                QuotationId = SeedIds.Quotation,
                CreatedByUserId = SeedIds.UserProcurementManager,
                CreatedByAgent = true,
                Status = ProposalStatus.PendingApproval,
                TotalEstimatedCost = 25_000m,
                Justification = "Procurement Coordinator Agent: replenish A4 paper stock ahead of projected shortfall.",
                CreatedAt = ts,
                UpdatedAt = ts
            },
            new ProcurementProposal
            {
                Id = SeedIds.ProposalConverted,
                BranchId = SeedIds.Branch,
                SupplierId = SeedIds.Supplier,
                QuotationId = SeedIds.Quotation,
                CreatedByUserId = SeedIds.UserProcurementManager,
                CreatedByAgent = false,
                Status = ProposalStatus.Converted,
                TotalEstimatedCost = 6_000m,
                Justification = "Quarterly consumables restock.",
                CreatedAt = ts,
                UpdatedAt = ts
            });

        builder.Entity<ProposalLineItem>().HasData(
            new ProposalLineItem { Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"), ProposalId = SeedIds.ProposalDraft, ProductId = SeedIds.ProductChair, Quantity = 2, UnitPrice = 15_000m, LineTotal = 30_000m, CreatedAt = ts, UpdatedAt = ts },
            new ProposalLineItem { Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002"), ProposalId = SeedIds.ProposalPendingApproval, ProductId = SeedIds.ProductPaper, Quantity = 50, UnitPrice = 500m, LineTotal = 25_000m, CreatedAt = ts, UpdatedAt = ts },
            new ProposalLineItem { Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003"), ProposalId = SeedIds.ProposalConverted, ProductId = SeedIds.ProductPaper, Quantity = 10, UnitPrice = 500m, LineTotal = 5_000m, CreatedAt = ts, UpdatedAt = ts },
            new ProposalLineItem { Id = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004"), ProposalId = SeedIds.ProposalConverted, ProductId = SeedIds.ProductInk, Quantity = 5, UnitPrice = 200m, LineTotal = 1_000m, CreatedAt = ts, UpdatedAt = ts });

        builder.Entity<ApprovalDecision>().HasData(new ApprovalDecision
        {
            Id = SeedIds.ApprovalDecisionForConverted,
            ProposalId = SeedIds.ProposalConverted,
            DecidedByUserId = SeedIds.UserBusinessOwner,
            Decision = ApprovalDecisionType.Approved,
            Comment = "Within budget, approved for standing consumables order.",
            DecidedAt = ts,
            CreatedAt = ts,
            UpdatedAt = ts
        });

        builder.Entity<PurchaseOrder>().HasData(new PurchaseOrder
        {
            Id = SeedIds.PurchaseOrder,
            ProposalId = SeedIds.ProposalConverted,
            SupplierId = SeedIds.Supplier,
            OrderNumber = "PO-2026-000001",
            Status = PurchaseOrderStatus.Received,
            TotalCost = 6_000m,
            ExpectedDeliveryDate = new DateOnly(2026, 1, 22),
            CreatedAt = ts,
            UpdatedAt = ts
        });

        builder.Entity<PurchaseOrderLineItem>().HasData(
            new PurchaseOrderLineItem { Id = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001"), PurchaseOrderId = SeedIds.PurchaseOrder, ProductId = SeedIds.ProductPaper, Quantity = 10, UnitPrice = 500m, CreatedAt = ts, UpdatedAt = ts },
            new PurchaseOrderLineItem { Id = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002"), PurchaseOrderId = SeedIds.PurchaseOrder, ProductId = SeedIds.ProductInk, Quantity = 5, UnitPrice = 200m, CreatedAt = ts, UpdatedAt = ts });

        builder.Entity<PurchaseOrderStatusHistory>().HasData(
            new PurchaseOrderStatusHistory { Id = Guid.Parse("cccccccc-0000-0000-0000-000000000001"), PurchaseOrderId = SeedIds.PurchaseOrder, FromStatus = null, ToStatus = PurchaseOrderStatus.Ordered, ChangedByUserId = SeedIds.UserProcurementManager, ChangedAt = ts, Notes = "Converted from proposal.", CreatedAt = ts, UpdatedAt = ts },
            new PurchaseOrderStatusHistory { Id = Guid.Parse("cccccccc-0000-0000-0000-000000000002"), PurchaseOrderId = SeedIds.PurchaseOrder, FromStatus = PurchaseOrderStatus.Ordered, ToStatus = PurchaseOrderStatus.Received, ChangedByUserId = SeedIds.UserProcurementManager, ChangedAt = ts.AddDays(6), Notes = "Delivery received in full.", CreatedAt = ts.AddDays(6), UpdatedAt = ts.AddDays(6) });
    }
}
