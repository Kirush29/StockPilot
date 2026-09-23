using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPilot.API.Common;
using StockPilot.API.DTOs.Transfer;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Controllers;

[ApiController]
[Route("api/transfers")]
[Authorize]
public class TransfersController(ITransferService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<TransferDto>>>> GetAll()
    {
        var result = await service.GetAllAsync();
        return Ok(ApiResponse<List<TransferDto>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
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
    [Authorize(Roles = "BranchManager")]
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
    [Authorize(Roles = "BranchManager,ProcurementManager")]
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
    [Authorize(Roles = "BranchManager,ProcurementManager")]
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
    [Authorize(Roles = "BranchManager,StoreEmployee")]
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
    [Authorize(Roles = "BranchManager,StoreEmployee")]
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
    [Authorize(Roles = "BranchManager,ProcurementManager")]
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

    // AI tool endpoint — read-only transfer history
    [HttpGet("tools/history")]
    public async Task<ActionResult<ApiResponse<List<TransferDto>>>> GetTransferHistory(
        [FromQuery] Guid productId, [FromQuery] Guid branchId)
    {
        var result = await service.GetTransferHistoryAsync(productId, branchId);
        return Ok(ApiResponse<List<TransferDto>>.Ok(result));
    }

    // AUTH-INTEGRATION-POINT: Replace with the auth team's claim type if different.
    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("User identity not found in token.");
        return Guid.Parse(claim);
    }
}
