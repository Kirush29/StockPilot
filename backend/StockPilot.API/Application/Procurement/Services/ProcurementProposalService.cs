using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StockPilot.Procurement.Application.Abstractions;
using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Repositories;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Services;

public class ProcurementProposalService(
    IProposalRepository proposals,
    IBudgetRepository budgets,
    IProductCatalogService products,
    ISupplierDirectoryService suppliers,
    IBranchDirectoryService branches,
    ICurrentUserService currentUser,
    IUnitOfWork unitOfWork,
    IOptions<ApprovalLimitOptions> approvalLimits,
    ILogger<ProcurementProposalService> logger) : IProcurementProposalService
{
    public async Task<ProposalDetailResponse> CreateAsync(CreateProposalRequest request, CancellationToken cancellationToken = default)
    {
        await ValidateBranchAsync(request.BranchId, cancellationToken);
        await ValidateSupplierAndQuotationAsync(request.SupplierId, request.QuotationId, cancellationToken);
        var (lineItems, total) = await BuildLineItemsAsync(request.LineItems, cancellationToken);

        await EnsureWithinBudgetAsync(request.BranchId, total, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var proposal = new ProcurementProposal
        {
            Id = Guid.NewGuid(),
            BranchId = request.BranchId,
            SupplierId = request.SupplierId,
            QuotationId = request.QuotationId,
            CreatedByUserId = currentUser.UserId,
            CreatedByAgent = request.CreatedByAgent,
            Status = request.SubmitForApproval ? ProposalStatus.PendingApproval : ProposalStatus.Draft,
            TotalEstimatedCost = total,
            Justification = request.Justification,
            CreatedAt = now,
            UpdatedAt = now,
            LineItems = lineItems
        };

        await proposals.AddAsync(proposal, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Proposal {ProposalId} created for branch {BranchId} by user {UserId} (agent={CreatedByAgent}) with estimated cost {TotalEstimatedCost:C}, status {Status}",
            proposal.Id, proposal.BranchId, currentUser.UserId, proposal.CreatedByAgent, proposal.TotalEstimatedCost, proposal.Status);

        return await ReloadDetailAsync(proposal.Id, cancellationToken);
    }

    public async Task<PagedResult<ProposalSummaryResponse>> ListAsync(ProposalListQuery query, CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await proposals.QueryAsync(query, cancellationToken);
        var mapped = items.Select(ToSummary).ToList();
        return new PagedResult<ProposalSummaryResponse>(mapped, query.Page, query.PageSize, totalCount);
    }

    public async Task<ProposalDetailResponse> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var proposal = await proposals.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(ProcurementProposal), id);
        return await ToDetailAsync(proposal, cancellationToken);
    }

    public async Task<ProposalDetailResponse> UpdateAsync(Guid id, UpdateProposalRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await proposals.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(ProcurementProposal), id);

        if (proposal.Status is not (ProposalStatus.Draft or ProposalStatus.RevisionRequested))
        {
            throw new ProcurementConflictException(
                $"Only proposals in Draft or RevisionRequested status can be edited (current status: {proposal.Status}).");
        }

        var isOwner = proposal.CreatedByUserId == currentUser.UserId;
        var isManager = currentUser.IsInRole(Domain.Common.ProcurementRoles.ProcurementManager)
            || currentUser.IsInRole(Domain.Common.ProcurementRoles.BusinessOwner);
        if (!isOwner && !isManager)
        {
            throw new ProcurementForbiddenException("You may only edit proposals you created.");
        }

        await ValidateSupplierAndQuotationAsync(request.SupplierId, request.QuotationId, cancellationToken);
        var (lineItems, total) = await BuildLineItemsAsync(request.LineItems, cancellationToken);
        await EnsureWithinBudgetAsync(proposal.BranchId, total, cancellationToken);

        proposal.SupplierId = request.SupplierId;
        proposal.QuotationId = request.QuotationId;
        proposal.Justification = request.Justification;
        proposal.TotalEstimatedCost = total;
        proposal.LineItems = lineItems;
        proposal.UpdatedAt = DateTimeOffset.UtcNow;
        if (request.SubmitForApproval)
        {
            proposal.Status = ProposalStatus.PendingApproval;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Proposal {ProposalId} updated by user {UserId}; new estimated cost {TotalEstimatedCost:C}, status {Status}",
            proposal.Id, currentUser.UserId, proposal.TotalEstimatedCost, proposal.Status);

        return await ReloadDetailAsync(proposal.Id, cancellationToken);
    }

    public async Task<ProposalDetailResponse> DecideAsync(Guid id, DecisionRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await proposals.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(ProcurementProposal), id);

        if (proposal.Status != ProposalStatus.PendingApproval)
        {
            throw new ProcurementConflictException(
                $"Only proposals awaiting approval can be decided on (current status: {proposal.Status}).");
        }

        if (request.Decision == ApprovalDecisionType.Approved)
        {
            var limit = approvalLimits.Value.GetHighestLimit(currentUser.Roles);
            if (limit == 0m)
            {
                throw new ProcurementForbiddenException("You are not authorized to approve procurement proposals.");
            }

            if (limit is decimal cap && proposal.TotalEstimatedCost > cap)
            {
                logger.LogWarning(
                    "User {UserId} attempted to approve proposal {ProposalId} of {Amount:C} exceeding their limit of {Limit:C}",
                    currentUser.UserId, proposal.Id, proposal.TotalEstimatedCost, cap);
                throw new ApprovalLimitExceededException(proposal.TotalEstimatedCost, cap);
            }
        }

        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var now = DateTimeOffset.UtcNow;
            var decision = new ApprovalDecision
            {
                Id = Guid.NewGuid(),
                ProposalId = proposal.Id,
                DecidedByUserId = currentUser.UserId,
                Decision = request.Decision,
                Comment = request.Comment,
                DecidedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };
            proposal.ApprovalDecisions.Add(decision);
            unitOfWork.Add(decision);

            proposal.Status = request.Decision switch
            {
                ApprovalDecisionType.Approved => ProposalStatus.Approved,
                ApprovalDecisionType.Rejected => ProposalStatus.Rejected,
                ApprovalDecisionType.RevisionRequested => ProposalStatus.RevisionRequested,
                _ => throw new ProcurementValidationException("decision", "Unrecognized decision type.")
            };
            proposal.UpdatedAt = now;

            await unitOfWork.SaveChangesAsync(ct);
        }, cancellationToken);

        logger.LogInformation(
            "Proposal {ProposalId} decided as {Decision} by user {UserId}; new status {Status}",
            proposal.Id, request.Decision, currentUser.UserId, proposal.Status);

        return await ReloadDetailAsync(proposal.Id, cancellationToken);
    }

    private async Task ValidateBranchAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var branch = await branches.GetBranchAsync(branchId, cancellationToken)
            ?? throw new ProcurementNotFoundException("Branch", branchId);
        if (!branch.IsActive)
        {
            throw new ProcurementValidationException("branchId", "Branch is not active.");
        }
    }

    private async Task ValidateSupplierAndQuotationAsync(Guid supplierId, Guid? quotationId, CancellationToken cancellationToken)
    {
        var supplier = await suppliers.GetSupplierAsync(supplierId, cancellationToken)
            ?? throw new ProcurementNotFoundException("Supplier", supplierId);
        if (!supplier.IsActive || supplier.IsBlocked)
        {
            throw new ProcurementValidationException("supplierId", "Supplier is inactive or blocked.");
        }

        if (quotationId is not { } qid)
        {
            return;
        }

        var quotation = await suppliers.GetQuotationAsync(qid, cancellationToken)
            ?? throw new ProcurementNotFoundException("Quotation", qid);
        if (quotation.SupplierId != supplierId)
        {
            throw new ProcurementValidationException("quotationId", "Quotation does not belong to the selected supplier.");
        }

        if (quotation.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            throw new ProcurementValidationException("quotationId", "Quotation has expired.");
        }
    }

    private async Task<(List<ProposalLineItem> LineItems, decimal Total)> BuildLineItemsAsync(
        IReadOnlyList<ProposalLineItemRequest> requests, CancellationToken cancellationToken)
    {
        var lineItems = new List<ProposalLineItem>();
        decimal total = 0m;

        foreach (var item in requests)
        {
            var product = await products.GetProductAsync(item.ProductId, cancellationToken)
                ?? throw new ProcurementNotFoundException("Product", item.ProductId);
            if (!product.IsActive)
            {
                throw new ProcurementValidationException("lineItems", $"Product '{product.Name}' is not active.");
            }

            var lineTotal = item.Quantity * item.UnitPrice;
            total += lineTotal;
            var now = DateTimeOffset.UtcNow;
            lineItems.Add(new ProposalLineItem
            {
                Id = Guid.NewGuid(),
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = lineTotal,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        return (lineItems, total);
    }

    private async Task EnsureWithinBudgetAsync(Guid branchId, decimal totalEstimatedCost, CancellationToken cancellationToken)
    {
        var budget = await budgets.FindActiveBudgetAsync(branchId, DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken)
            ?? throw new ProcurementValidationException("branchId", "No active budget is defined for this branch and period.");

        if (totalEstimatedCost > budget.RemainingAmount)
        {
            logger.LogWarning(
                "Proposal for branch {BranchId} of {Amount:C} exceeds remaining budget {Remaining:C}",
                branchId, totalEstimatedCost, budget.RemainingAmount);
            throw new BudgetExceededException(totalEstimatedCost, budget.RemainingAmount);
        }
    }

    private async Task<ProposalDetailResponse> ReloadDetailAsync(Guid id, CancellationToken cancellationToken)
    {
        var proposal = await proposals.GetByIdAsync(id, cancellationToken)
            ?? throw new ProcurementNotFoundException(nameof(ProcurementProposal), id);
        return await ToDetailAsync(proposal, cancellationToken);
    }

    private async Task<ProposalDetailResponse> ToDetailAsync(ProcurementProposal proposal, CancellationToken cancellationToken)
    {
        var lineItems = new List<ProposalLineItemResponse>();
        foreach (var li in proposal.LineItems)
        {
            var product = await products.GetProductAsync(li.ProductId, cancellationToken);
            lineItems.Add(new ProposalLineItemResponse(li.Id, li.ProductId, product?.Name ?? "(unknown product)", li.Quantity, li.UnitPrice, li.LineTotal));
        }

        var decisions = proposal.ApprovalDecisions
            .OrderByDescending(d => d.DecidedAt)
            .Select(d => new ApprovalDecisionResponse(d.Id, d.DecidedByUserId, d.Decision, d.Comment, d.DecidedAt))
            .ToList();

        return new ProposalDetailResponse(
            proposal.Id,
            proposal.BranchId,
            proposal.SupplierId,
            proposal.QuotationId,
            proposal.CreatedByUserId,
            proposal.CreatedByAgent,
            proposal.Status,
            proposal.TotalEstimatedCost,
            proposal.Justification,
            proposal.CreatedAt,
            proposal.UpdatedAt,
            lineItems,
            decisions);
    }

    private static ProposalSummaryResponse ToSummary(ProcurementProposal proposal) => new(
        proposal.Id,
        proposal.BranchId,
        proposal.SupplierId,
        proposal.Status,
        proposal.TotalEstimatedCost,
        proposal.CreatedByAgent,
        proposal.CreatedAt,
        proposal.UpdatedAt);
}
