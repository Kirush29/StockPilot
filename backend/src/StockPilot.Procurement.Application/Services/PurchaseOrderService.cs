using Microsoft.Extensions.Logging;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Services;

public class PurchaseOrderService(
    IPurchaseOrderRepository orders,
    IProposalRepository proposals,
    IBudgetRepository budgets,
    IInventoryStockUpdater inventory,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    ILogger<PurchaseOrderService> logger) : IPurchaseOrderService
{
    private static readonly Dictionary<PurchaseOrderStatus, PurchaseOrderStatus[]> AllowedTransitions = new()
    {
        [PurchaseOrderStatus.Ordered] = [PurchaseOrderStatus.PartiallyReceived, PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled],
        [PurchaseOrderStatus.PartiallyReceived] = [PurchaseOrderStatus.Received, PurchaseOrderStatus.Cancelled],
        [PurchaseOrderStatus.Received] = [],
        [PurchaseOrderStatus.Cancelled] = []
    };

    public async Task<PurchaseOrderDetailResponse> ConvertProposalAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await proposals.GetByIdAsync(proposalId, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(ProcurementProposal), proposalId);

        if (proposal.Status != ProposalStatus.Approved)
        {
            throw new ProcurementConflictException(
                $"Only an Approved proposal can be converted to a purchase order (current status: {proposal.Status}).");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var budget = await budgets.FindActiveBudgetAsync(proposal.BranchId, today, cancellationToken)
            ?? throw new ProcurementValidationException("branchId", "No active budget is defined for this branch and period.");

        if (proposal.TotalEstimatedCost > budget.RemainingAmount)
        {
            throw new BudgetExceededException(proposal.TotalEstimatedCost, budget.RemainingAmount);
        }

        var now = DateTimeOffset.UtcNow;
        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            ProposalId = proposal.Id,
            SupplierId = proposal.SupplierId,
            OrderNumber = await orders.GenerateOrderNumberAsync(now.Year, cancellationToken),
            Status = PurchaseOrderStatus.Ordered,
            TotalCost = proposal.TotalEstimatedCost,
            ExpectedDeliveryDate = null,
            CreatedAt = now,
            UpdatedAt = now,
            LineItems = proposal.LineItems.Select(li => new PurchaseOrderLineItem
            {
                Id = Guid.NewGuid(),
                ProductId = li.ProductId,
                Quantity = li.Quantity,
                UnitPrice = li.UnitPrice
            }).ToList()
        };
        order.StatusHistory.Add(new PurchaseOrderStatusHistory
        {
            Id = Guid.NewGuid(),
            FromStatus = null,
            ToStatus = PurchaseOrderStatus.Ordered,
            ChangedByUserId = currentUser.UserId,
            ChangedAt = now,
            Notes = $"Converted from proposal {proposal.Id}."
        });

        budget.SpentAmount += order.TotalCost;
        budget.UpdatedAt = now;

        proposal.Status = ProposalStatus.Converted;
        proposal.UpdatedAt = now;

        await orders.AddAsync(order, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Proposal {ProposalId} converted to purchase order {OrderNumber} ({OrderId}) totalling {TotalCost:C} by user {UserId}; budget {BudgetId} committed spend now {SpentAmount:C}",
            proposal.Id, order.OrderNumber, order.Id, order.TotalCost, currentUser.UserId, budget.Id, budget.SpentAmount);

        return ToDetail(order);
    }

    public async Task<PagedResult<PurchaseOrderSummaryResponse>> ListAsync(OrderListQuery query, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await orders.QueryAsync(query, cancellationToken);
        var mapped = items.Select(ToSummary).ToList();
        return new PagedResult<PurchaseOrderSummaryResponse>(mapped, query.Page, query.PageSize, totalCount);
    }

    public async Task<PurchaseOrderDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(PurchaseOrder), id);
        return ToDetail(order);
    }

    public async Task<PurchaseOrderDetailResponse> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken cancellationToken = default)
    {
        var order = await orders.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(PurchaseOrder), id);

        var allowedTargets = AllowedTransitions[order.Status];
        if (!allowedTargets.Contains(request.Status))
        {
            throw new InvalidStateTransitionException(nameof(PurchaseOrder), order.Status.ToString(), request.Status.ToString());
        }

        var now = DateTimeOffset.UtcNow;

        if (request.Status == PurchaseOrderStatus.Cancelled)
        {
            var budget = await budgets.FindActiveBudgetAsync(
                order.Proposal!.BranchId, DateOnly.FromDateTime(order.CreatedAt.UtcDateTime), cancellationToken);
            if (budget is not null)
            {
                budget.SpentAmount -= order.TotalCost;
                budget.UpdatedAt = now;
            }
        }
        else if (request.Status == PurchaseOrderStatus.Received)
        {
            // Partial-quantity receiving isn't modeled yet (no per-line received quantity on the
            // request), so inventory is only notified once the order is fully Received.
            foreach (var line in order.LineItems)
            {
                await inventory.NotifyStockReceivedAsync(order.Proposal!.BranchId, line.ProductId, line.Quantity, order.Id, cancellationToken);
            }
        }

        order.StatusHistory.Add(new PurchaseOrderStatusHistory
        {
            Id = Guid.NewGuid(),
            FromStatus = order.Status,
            ToStatus = request.Status,
            ChangedByUserId = currentUser.UserId,
            ChangedAt = now,
            Notes = request.Notes
        });
        order.Status = request.Status;
        order.UpdatedAt = now;

        await unitOfWork.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Purchase order {OrderId} ({OrderNumber}) moved to status {Status} by user {UserId}",
            order.Id, order.OrderNumber, order.Status, currentUser.UserId);

        return ToDetail(order);
    }

    private static PurchaseOrderSummaryResponse ToSummary(PurchaseOrder order) => new(
        order.Id, order.ProposalId, order.SupplierId, order.OrderNumber, order.Status, order.TotalCost, order.ExpectedDeliveryDate, order.CreatedAt);

    private static PurchaseOrderDetailResponse ToDetail(PurchaseOrder order) => new(
        order.Id,
        order.ProposalId,
        order.SupplierId,
        order.OrderNumber,
        order.Status,
        order.TotalCost,
        order.ExpectedDeliveryDate,
        order.CreatedAt,
        order.UpdatedAt,
        order.LineItems.Select(li => new PurchaseOrderLineItemResponse(li.Id, li.ProductId, li.Quantity, li.UnitPrice, li.LineTotal)).ToList(),
        order.StatusHistory
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new PurchaseOrderStatusHistoryResponse(h.FromStatus, h.ToStatus, h.ChangedByUserId, h.ChangedAt, h.Notes))
            .ToList());
}
