using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Exceptions;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Entities;
using StockPilot.Procurement.Domain.Enums;
using StockPilot.Procurement.Tests.TestHelpers;
using Xunit;

namespace StockPilot.Procurement.Tests.Services;

public class ProcurementProposalServiceTests
{
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid SupplierId = Guid.NewGuid();
    private static readonly Guid ProductId = Guid.NewGuid();

    private readonly InMemoryProposalRepository _proposals = new();
    private readonly InMemoryBudgetRepository _budgets = new();
    private readonly FakeProductCatalogService _products = new FakeProductCatalogService().WithProduct(ProductId);
    private readonly FakeSupplierDirectoryService _suppliers = new FakeSupplierDirectoryService().WithSupplier(SupplierId);
    private readonly FakeBranchDirectoryService _branches = new FakeBranchDirectoryService().WithBranch(BranchId);

    private ProcurementProposalService BuildService(Guid userId, params string[] roles) => new(
        _proposals,
        _budgets,
        _products,
        _suppliers,
        _branches,
        new FakeCurrentUserService(userId, roles),
        new InMemoryUnitOfWork(),
        Options.Create(new ApprovalLimitOptions { ProcurementManager = 50_000m, BusinessOwner = null }),
        NullLogger<ProcurementProposalService>.Instance);

    private void SeedBudget(decimal allocated, decimal spent = 0m) => _budgets.Budgets.Add(new Budget
    {
        Id = Guid.NewGuid(),
        BranchId = BranchId,
        PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1),
        PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1),
        AllocatedAmount = allocated,
        SpentAmount = spent
    });

    private static CreateProposalRequest MakeRequest(int quantity = 10, decimal unitPrice = 100m, bool submit = true) => new(
        BranchId, SupplierId, null, "Test justification", false,
        [new ProposalLineItemRequest(ProductId, quantity, unitPrice)], submit);

    [Fact]
    public async Task CreateAsync_WithinBudget_CreatesPendingApprovalProposal()
    {
        SeedBudget(10_000m);
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);

        var result = await service.CreateAsync(MakeRequest(quantity: 10, unitPrice: 100m), CancellationToken.None);

        result.Status.Should().Be(ProposalStatus.PendingApproval);
        result.TotalEstimatedCost.Should().Be(1000m);
    }

    [Fact]
    public async Task CreateAsync_SubmitForApprovalFalse_CreatesDraft()
    {
        SeedBudget(10_000m);
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);

        var result = await service.CreateAsync(MakeRequest(submit: false), CancellationToken.None);

        result.Status.Should().Be(ProposalStatus.Draft);
    }

    [Fact]
    public async Task CreateAsync_ExceedsBudget_ThrowsBudgetExceeded()
    {
        SeedBudget(500m);
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);

        var act = () => service.CreateAsync(MakeRequest(quantity: 10, unitPrice: 100m), CancellationToken.None);

        await act.Should().ThrowAsync<BudgetExceededException>();
    }

    [Fact]
    public async Task CreateAsync_NoBudgetDefined_ThrowsValidation()
    {
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);

        var act = () => service.CreateAsync(MakeRequest(), CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementValidationException>();
    }

    [Fact]
    public async Task CreateAsync_BlockedSupplier_ThrowsValidation()
    {
        SeedBudget(10_000m);
        _suppliers.WithSupplier(SupplierId, isActive: true, isBlocked: true);
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);

        var act = () => service.CreateAsync(MakeRequest(), CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementValidationException>();
    }

    [Fact]
    public async Task CreateAsync_ExpiredQuotation_ThrowsValidation()
    {
        SeedBudget(10_000m);
        var quotationId = Guid.NewGuid();
        _suppliers.WithQuotation(quotationId, SupplierId, DateTimeOffset.UtcNow.AddDays(-1));
        var service = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);
        var request = MakeRequest() with { QuotationId = quotationId };

        var act = () => service.CreateAsync(request, CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementValidationException>();
    }

    [Fact]
    public async Task DecideAsync_ApproveExceedingLimit_ThrowsApprovalLimitExceeded()
    {
        SeedBudget(1_000_000m);
        var creatorId = Guid.NewGuid();
        var creatorService = BuildService(creatorId, ProcurementRoles.BranchManager);
        var proposal = await creatorService.CreateAsync(MakeRequest(quantity: 1000, unitPrice: 100m), CancellationToken.None); // 100,000

        var approver = BuildService(Guid.NewGuid(), ProcurementRoles.ProcurementManager);
        var act = () => approver.DecideAsync(proposal.Id, new DecisionRequest(ApprovalDecisionType.Approved, null), CancellationToken.None);

        await act.Should().ThrowAsync<ApprovalLimitExceededException>();
    }

    [Fact]
    public async Task DecideAsync_BusinessOwnerUnlimited_Approves()
    {
        SeedBudget(1_000_000m);
        var creatorService = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);
        var proposal = await creatorService.CreateAsync(MakeRequest(quantity: 1000, unitPrice: 100m), CancellationToken.None);

        var approver = BuildService(Guid.NewGuid(), ProcurementRoles.BusinessOwner);
        var result = await approver.DecideAsync(proposal.Id, new DecisionRequest(ApprovalDecisionType.Approved, "Approved, large but justified."), CancellationToken.None);

        result.Status.Should().Be(ProposalStatus.Approved);
    }

    [Fact]
    public async Task DecideAsync_NotPendingApproval_ThrowsConflict()
    {
        SeedBudget(10_000m);
        var creatorService = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);
        var proposal = await creatorService.CreateAsync(MakeRequest(submit: false), CancellationToken.None); // Draft

        var approver = BuildService(Guid.NewGuid(), ProcurementRoles.BusinessOwner);
        var act = () => approver.DecideAsync(proposal.Id, new DecisionRequest(ApprovalDecisionType.Approved, null), CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }

    [Fact]
    public async Task UpdateAsync_EditedByNonOwnerNonManager_ThrowsForbidden()
    {
        SeedBudget(10_000m);
        var creatorService = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);
        var proposal = await creatorService.CreateAsync(MakeRequest(submit: false), CancellationToken.None);

        var otherBranchManager = BuildService(Guid.NewGuid(), ProcurementRoles.BranchManager);
        var request = new UpdateProposalRequest(SupplierId, null, "edit", [new ProposalLineItemRequest(ProductId, 1, 100m)]);
        var act = () => otherBranchManager.UpdateAsync(proposal.Id, request, CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementForbiddenException>();
    }

    [Fact]
    public async Task UpdateAsync_OnApprovedProposal_ThrowsConflict()
    {
        SeedBudget(1_000_000m);
        var creatorId = Guid.NewGuid();
        var creatorService = BuildService(creatorId, ProcurementRoles.BranchManager);
        var proposal = await creatorService.CreateAsync(MakeRequest(), CancellationToken.None);
        var approver = BuildService(Guid.NewGuid(), ProcurementRoles.BusinessOwner);
        await approver.DecideAsync(proposal.Id, new DecisionRequest(ApprovalDecisionType.Approved, null), CancellationToken.None);

        var request = new UpdateProposalRequest(SupplierId, null, "edit", [new ProposalLineItemRequest(ProductId, 1, 100m)]);
        var act = () => creatorService.UpdateAsync(proposal.Id, request, CancellationToken.None);

        await act.Should().ThrowAsync<ProcurementConflictException>();
    }
}
