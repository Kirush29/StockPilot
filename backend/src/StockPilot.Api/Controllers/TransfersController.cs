using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.Api.Common;
using StockPilot.Application.DTOs.Transfer;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Exceptions;

namespace StockPilot.Api.Controllers;

[ApiController]
[Route("api/transfers")]
[Authorize]
public class TransfersController(ITransferService service, ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<TransferDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<TransferDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> GetById(Guid id)
    {
        try
        {
            var result = await service.GetByIdAsync(id);
            return Ok(ApiResponse<TransferDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost]
    [Authorize(Policy = "TransferCreate")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Create([FromBody] CreateTransferDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var requestedBy = GetUserId();
            var result = await service.CreateAsync(dto, requestedBy);
            return CreatedAtAction(nameof(GetById), new { id = result.StockTransferId },
                ApiResponse<TransferDto>.Ok(result, "Transfer request created."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = "TransferApprove")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Approve(Guid id, [FromBody] ApproveTransferDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var approvedBy = GetUserId();
            var result = await service.ApproveAsync(id, dto, approvedBy);
            return Ok(ApiResponse<TransferDto>.Ok(result, "Transfer approved."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = "TransferApprove")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Reject(Guid id, [FromBody] RejectTransferDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var rejectedBy = GetUserId();
            var result = await service.RejectAsync(id, dto, rejectedBy);
            return Ok(ApiResponse<TransferDto>.Ok(result, "Transfer rejected."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/ship")]
    [Authorize(Policy = "TransferShip")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Ship(Guid id)
    {
        try
        {
            var shippedBy = GetUserId();
            var result = await service.ShipAsync(id, shippedBy);
            return Ok(ApiResponse<TransferDto>.Ok(result, "Transfer shipped."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Policy = "TransferReceive")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Receive(Guid id, [FromBody] ReceiveTransferDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        try
        {
            var receivedBy = GetUserId();
            var result = await service.ReceiveAsync(id, dto, receivedBy);
            return Ok(ApiResponse<TransferDto>.Ok(result, "Transfer received."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = "TransferCreate")]
    public async Task<ActionResult<ApiResponse<TransferDto>>> Cancel(Guid id)
    {
        try
        {
            var cancelledBy = GetUserId();
            var result = await service.CancelAsync(id, cancelledBy);
            return Ok(ApiResponse<TransferDto>.Ok(result, "Transfer cancelled."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse.Fail(ex.Message));
        }
    }

    [HttpGet("tools/history")]
    [Authorize(Policy = "InventoryRead")]
    public async Task<ActionResult<ApiResponse<List<TransferDto>>>> GetTransferHistory(
        [FromQuery] Guid productId, [FromQuery] Guid branchId)
    {
        var result = await service.GetTransferHistoryAsync(productId, branchId);
        return Ok(ApiResponse<List<TransferDto>>.Ok(result));
    }

    private Guid GetUserId()
    {
        return currentUserService.UserId ?? throw new UnauthorizedAccessException("User identity not found in token.");
    }
}
