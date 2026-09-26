using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.Procurement.Application.Dtos.Budgets;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;

namespace StockPilot.API.Controllers;

[Route("api/procurement/budgets")]
[Authorize(Roles = ProcurementRoles.RaiseOrView)]
[Produces("application/json")]
public class BudgetsController(
    IBudgetService budgetService,
    IValidator<CreateBudgetRequest> createValidator) : ProcurementControllerBase
{
    /// <summary>List budgets, optionally filtered by branch.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BudgetResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<BudgetResponse>>> List([FromQuery] Guid? branchId, CancellationToken cancellationToken) =>
        Ok(await budgetService.ListAsync(branchId, cancellationToken));

    /// <summary>Create a new branch/period budget allocation.</summary>
    [HttpPost]
    [Authorize(Roles = ProcurementRoles.ManageProcurement)]
    [ProducesResponseType(typeof(BudgetResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BudgetResponse>> Create([FromBody] CreateBudgetRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(createValidator, request, cancellationToken);
        var created = await budgetService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetUtilization), new { id = created.Id }, created);
    }

    /// <summary>Business-specific operation: computed remaining-budget report for a single budget.</summary>
    [HttpGet("{id:guid}/utilization")]
    [ProducesResponseType(typeof(BudgetUtilizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BudgetUtilizationResponse>> GetUtilization(Guid id, CancellationToken cancellationToken) =>
        Ok(await budgetService.GetUtilizationAsync(id, cancellationToken));
}
