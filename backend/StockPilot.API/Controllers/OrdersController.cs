using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.Procurement.Application.Dtos.Common;
using StockPilot.Procurement.Application.Dtos.Orders;
using StockPilot.Procurement.Application.Services;
using StockPilot.Procurement.Domain.Common;
using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.API.Controllers;

[Route("api/procurement/orders")]
[Authorize(Roles = ProcurementRoles.ViewOrders)]
[Produces("application/json")]
public class OrdersController(
    IPurchaseOrderService orderService,
    IValidator<UpdateOrderStatusRequest> updateStatusValidator) : ProcurementControllerBase
{
    /// <summary>List purchase orders, optionally filtered by status.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PurchaseOrderSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PurchaseOrderSummaryResponse>>> List(
        [FromQuery] PurchaseOrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new OrderListQuery(status, page, pageSize);
        return Ok(await orderService.ListAsync(query, cancellationToken));
    }

    /// <summary>Get a single purchase order, including its line items and status history.</summary>
    [HttpGet("{id:guid}", Name = nameof(GetById))]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseOrderDetailResponse>> GetById(Guid id, CancellationToken cancellationToken) =>
        Ok(await orderService.GetByIdAsync(id, cancellationToken));

    /// <summary>
    /// Move a purchase order to PartiallyReceived, Received or Cancelled. Cancelling releases the
    /// committed budget; a full Received notifies the Inventory module to increase stock.
    /// StoreEmployee may only record receiving (PartiallyReceived/Received) — cancelling stays
    /// restricted to ProcurementManager/BusinessOwner, enforced in <see cref="IPurchaseOrderService"/>.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = ProcurementRoles.UpdateOrderStatus)]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PurchaseOrderDetailResponse>> UpdateStatus(
        Guid id, [FromBody] UpdateOrderStatusRequest request, CancellationToken cancellationToken)
    {
        await ValidateAsync(updateStatusValidator, request, cancellationToken);
        return Ok(await orderService.UpdateStatusAsync(id, request, cancellationToken));
    }
}
