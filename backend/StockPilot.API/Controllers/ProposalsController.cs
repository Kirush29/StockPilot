using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Procurement.Api.Common;
using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Dtos.Proposals;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Api.Controllers;

[Route("api/procurement/proposals")]
[Authorize]
[Produces("application/json")]
public class ProposalsController(
    IProcurementProposalService proposalService,
    IPurchaseOrderService purchaseOrderService,
    IAuthorizationService authorizationService,
    IValidator<CreateProposalRequest> createValidator,
    IValidator<UpdateProposalRequest> updateValidator,
    IValidator<DecisionRequest> decisionValidator) : ProcurementControllerBase
{
    /// <summary>Create a procurement proposal, submitted manually by a branch/procurement user or produced by the Procurement Coordinator Agent.</summary>
    [HttpPost]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(ProposalDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProposalDetailResponse>> Create([FromBody] CreateProposalRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(createValidator, request, cancellationToken);
        var created = await proposalService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>List proposals, filterable by status, supplier and branch, sortable and paged.</summary>
    [HttpGet]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(PagedResult<ProposalSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProposalSummaryResponse>>> List(
        [FromQuery] ProposalStatus? status,
        [FromQuery] Guid? supplierId,
        [FromQuery] Guid? branchId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sort = "-createdAt",
        CancellationToken cancellationToken = default)
    {
        var query = new ProposalListQuery(status, supplierId, branchId, page, pageSize, sort);
        return Ok(await proposalService.ListAsync(query, cancellationToken));
    }

    /// <summary>Get a single proposal, including its line items and approval decision history.</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(ProposalDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProposalDetailResponse>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await proposalService.GetByIdAsync(id, cancellationToken));

    /// <summary>Edit a proposal that is still in Draft or RevisionRequested status.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = ProcurementRoles.RaiseOrView)]
    [ProducesResponseType(typeof(ProposalDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProposalDetailResponse>> Update(Guid id, [FromBody] UpdateProposalRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(updateValidator, request, cancellationToken);
        return Ok(await proposalService.UpdateAsync(id, request, cancellationToken));
    }

    /// <summary>
    /// Business-specific operation: a manager approves, rejects, or requests revision on a proposal
    /// awaiting review. Approval is capped by the caller's role-based approval limit.
    /// </summary>
    [HttpPost("{id:guid}/decision")]
    [Authorize(Roles = ProcurementRoles.ManageProcurement)]
    [ProducesResponseType(typeof(ProposalDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProposalDetailResponse>> Decide(Guid id, [FromBody] DecisionRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(decisionValidator, request, cancellationToken);

        if (request.Decision == ApprovalDecisionType.Approved)
        {
            var proposal = await proposalService.GetByIdAsync(id, cancellationToken);
            var authResult = await authorizationService.AuthorizeAsync(User, proposal, "CanApproveProcurement");
            if (!authResult.Succeeded)
            {
                return Forbid();
            }
        }

        return Ok(await proposalService.DecideAsync(id, request, cancellationToken));
    }

    /// <summary>Business-specific operation: convert an Approved proposal into a PurchaseOrder. Allowed once, only while Approved.</summary>
    [HttpPost("{id:guid}/convert")]
    [Authorize(Roles = ProcurementRoles.ManageProcurement)]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PurchaseOrderDetailResponse>> Convert(Guid id, CancellationToken cancellationToken)
    {
        var order = await purchaseOrderService.ConvertProposalAsync(id, cancellationToken);
        return CreatedAtAction("GetById", "Orders", new { id = order.Id }, order);
    }
}
