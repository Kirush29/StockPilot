using Microsoft.EntityFrameworkCore;
using StockPilot.API.Data;
using StockPilot.API.DTOs.Transfer;
using StockPilot.API.Entities;
using StockPilot.API.Interfaces;

namespace StockPilot.API.Services;

public class TransferService(AppDbContext db) : ITransferService
{
    public async Task<List<TransferDto>> GetAllAsync() =>
        await BuildQuery().OrderByDescending(t => t.RequestedAt).ToListAsync();

    public async Task<TransferDto> GetByIdAsync(Guid id)
    {
        var transfer = await BuildQuery().FirstOrDefaultAsync(t => t.StockTransferId == id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");
        return transfer;
    }

    public async Task<List<TransferDto>> GetTransferHistoryAsync(Guid productId, Guid branchId) =>
        await BuildQuery()
            .Where(t => t.SourceBranchId == branchId || t.DestinationBranchId == branchId)
            .OrderByDescending(t => t.RequestedAt)
            .ToListAsync();

    public async Task<TransferDto> CreateAsync(CreateTransferDto dto, Guid requestedBy)
    {
        if (dto.SourceBranchId == dto.DestinationBranchId)
            throw new ArgumentException("Source and destination branches cannot be the same.");

        if (!dto.Items.Any())
            throw new ArgumentException("Transfer must contain at least one item.");

        if (!await db.Branches.AnyAsync(b => b.BranchId == dto.SourceBranchId && b.IsActive))
            throw new ArgumentException("Source branch does not exist or is inactive.");

        if (!await db.Branches.AnyAsync(b => b.BranchId == dto.DestinationBranchId && b.IsActive))
            throw new ArgumentException("Destination branch does not exist or is inactive.");

        foreach (var item in dto.Items)
        {
            if (item.RequestedQuantity <= 0)
                throw new ArgumentException("Requested quantity must be greater than zero.");

            if (!await db.Products.AnyAsync(p => p.ProductId == item.ProductId && p.IsActive))
                throw new ArgumentException($"Product {item.ProductId} does not exist or is inactive.");
        }

        var transferNumber = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var transfer = new StockTransfer
        {
            StockTransferId = Guid.NewGuid(),
            TransferNumber = transferNumber,
            SourceBranchId = dto.SourceBranchId,
            DestinationBranchId = dto.DestinationBranchId,
            Status = TransferStatus.Requested,
            RequestedBy = requestedBy,
            Notes = dto.Notes,
            RequestedAt = DateTime.UtcNow,
            Items = dto.Items.Select(i => new StockTransferItem
            {
                StockTransferItemId = Guid.NewGuid(),
                ProductId = i.ProductId,
                BatchId = i.BatchId,
                RequestedQuantity = i.RequestedQuantity
            }).ToList()
        };

        db.StockTransfers.Add(transfer);
        await db.SaveChangesAsync();
        return await GetByIdAsync(transfer.StockTransferId);
    }

    public async Task<TransferDto> ApproveAsync(Guid id, ApproveTransferDto dto, Guid approvedBy)
    {
        var transfer = await db.StockTransfers.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.StockTransferId == id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");

        if (transfer.Status != TransferStatus.Requested)
            throw new InvalidOperationException($"Transfer cannot be approved from status '{transfer.Status}'.");

        foreach (var approvalItem in dto.Items)
        {
            var item = transfer.Items.FirstOrDefault(i => i.StockTransferItemId == approvalItem.StockTransferItemId)
                ?? throw new ArgumentException($"Transfer item {approvalItem.StockTransferItemId} not found.");

            if (approvalItem.ApprovedQuantity < 0)
                throw new ArgumentException("Approved quantity cannot be negative.");

            if (approvalItem.ApprovedQuantity > item.RequestedQuantity)
                throw new ArgumentException("Approved quantity cannot exceed requested quantity.");

            // Verify source stock is available
            var inventory = await db.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.BranchId == transfer.SourceBranchId);

            if (inventory == null || inventory.AvailableQuantity < approvalItem.ApprovedQuantity)
                throw new InvalidOperationException(
                    $"Insufficient stock for product {item.ProductId}. " +
                    $"Available: {inventory?.AvailableQuantity ?? 0}, Requested: {approvalItem.ApprovedQuantity}.");

            item.ApprovedQuantity = approvalItem.ApprovedQuantity;
        }

        transfer.Status = TransferStatus.Approved;
        transfer.ApprovedBy = approvedBy;
        transfer.ApprovedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TransferDto> RejectAsync(Guid id, RejectTransferDto dto, Guid rejectedBy)
    {
        var transfer = await db.StockTransfers.FindAsync(id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");

        if (transfer.Status != TransferStatus.Requested)
            throw new InvalidOperationException($"Transfer cannot be rejected from status '{transfer.Status}'.");

        if (string.IsNullOrWhiteSpace(dto.RejectionReason))
            throw new ArgumentException("Rejection reason is required.");

        transfer.Status = TransferStatus.Rejected;
        transfer.RejectionReason = dto.RejectionReason;
        transfer.RejectedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TransferDto> ShipAsync(Guid id, Guid shippedBy)
    {
        var transfer = await db.StockTransfers.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.StockTransferId == id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");

        if (transfer.Status != TransferStatus.Approved)
            throw new InvalidOperationException($"Transfer cannot be shipped from status '{transfer.Status}'.");

        await using var tx = await db.Database.BeginTransactionAsync();

        foreach (var item in transfer.Items)
        {
            var shippedQty = item.ApprovedQuantity ?? item.RequestedQuantity;
            if (shippedQty <= 0) continue;

            var inventory = await db.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.BranchId == transfer.SourceBranchId)
                ?? throw new InvalidOperationException($"No inventory for product {item.ProductId} at source branch.");

            if (inventory.QuantityOnHand < shippedQty)
                throw new InvalidOperationException(
                    $"Insufficient stock for product {item.ProductId}. " +
                    $"On hand: {inventory.QuantityOnHand}, Required: {shippedQty}.");

            var previousQty = inventory.QuantityOnHand;
            inventory.QuantityOnHand -= shippedQty;
            inventory.UpdatedAt = DateTime.UtcNow;
            item.ShippedQuantity = shippedQty;

            db.StockMovements.Add(new StockMovement
            {
                StockMovementId = Guid.NewGuid(),
                ProductId = item.ProductId,
                BatchId = item.BatchId,
                BranchId = transfer.SourceBranchId,
                MovementType = MovementType.TransferOut,
                Quantity = shippedQty,
                ReferenceType = "StockTransfer",
                ReferenceId = transfer.StockTransferId.ToString(),
                PreviousQuantity = previousQty,
                NewQuantity = inventory.QuantityOnHand,
                Reason = $"Transfer {transfer.TransferNumber} shipped",
                PerformedBy = shippedBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        transfer.Status = TransferStatus.InTransit;
        transfer.ShippedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TransferDto> ReceiveAsync(Guid id, ReceiveTransferDto dto, Guid receivedBy)
    {
        var transfer = await db.StockTransfers.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.StockTransferId == id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");

        if (transfer.Status != TransferStatus.InTransit)
            throw new InvalidOperationException($"Transfer cannot be received from status '{transfer.Status}'.");

        if (transfer.ReceivedAt.HasValue)
            throw new InvalidOperationException("Transfer has already been received.");

        await using var tx = await db.Database.BeginTransactionAsync();

        foreach (var receiveItem in dto.Items)
        {
            var item = transfer.Items.FirstOrDefault(i => i.StockTransferItemId == receiveItem.StockTransferItemId)
                ?? throw new ArgumentException($"Transfer item {receiveItem.StockTransferItemId} not found.");

            if (receiveItem.ReceivedQuantity < 0)
                throw new ArgumentException("Received quantity cannot be negative.");

            var receivedQty = receiveItem.ReceivedQuantity;
            if (receivedQty <= 0) continue;

            // Update or create destination inventory
            var inventory = await db.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.BranchId == transfer.DestinationBranchId);

            decimal previousQty = 0;
            if (inventory == null)
            {
                inventory = new Inventory
                {
                    InventoryId = Guid.NewGuid(),
                    ProductId = item.ProductId,
                    BranchId = transfer.DestinationBranchId,
                    QuantityOnHand = receivedQty,
                    ReservedQuantity = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                db.Inventories.Add(inventory);
            }
            else
            {
                previousQty = inventory.QuantityOnHand;
                inventory.QuantityOnHand += receivedQty;
                inventory.UpdatedAt = DateTime.UtcNow;
            }

            item.ReceivedQuantity = receivedQty;

            db.StockMovements.Add(new StockMovement
            {
                StockMovementId = Guid.NewGuid(),
                ProductId = item.ProductId,
                BatchId = item.BatchId,
                BranchId = transfer.DestinationBranchId,
                MovementType = MovementType.TransferIn,
                Quantity = receivedQty,
                ReferenceType = "StockTransfer",
                ReferenceId = transfer.StockTransferId.ToString(),
                PreviousQuantity = previousQty,
                NewQuantity = previousQty + receivedQty,
                Reason = $"Transfer {transfer.TransferNumber} received",
                PerformedBy = receivedBy,
                CreatedAt = DateTime.UtcNow
            });
        }

        transfer.Status = TransferStatus.Received;
        transfer.ReceivedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TransferDto> CancelAsync(Guid id, Guid cancelledBy)
    {
        var transfer = await db.StockTransfers.FindAsync(id)
            ?? throw new KeyNotFoundException($"Transfer {id} not found.");

        if (transfer.Status is TransferStatus.InTransit or TransferStatus.Received)
            throw new InvalidOperationException($"Transfer cannot be cancelled from status '{transfer.Status}'.");

        transfer.Status = TransferStatus.Cancelled;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    private IQueryable<TransferDto> BuildQuery() =>
        db.StockTransfers
            .Include(t => t.SourceBranch)
            .Include(t => t.DestinationBranch)
            .Include(t => t.RequestedByUser)
            .Include(t => t.ApprovedByUser)
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .Include(t => t.Items).ThenInclude(i => i.Batch)
            .Select(t => new TransferDto
            {
                StockTransferId = t.StockTransferId,
                TransferNumber = t.TransferNumber,
                SourceBranchId = t.SourceBranchId,
                SourceBranchName = t.SourceBranch.Name,
                DestinationBranchId = t.DestinationBranchId,
                DestinationBranchName = t.DestinationBranch.Name,
                Status = t.Status.ToString(),
                RequestedBy = t.RequestedBy,
                RequestedByName = t.RequestedByUser.FullName,
                ApprovedBy = t.ApprovedBy,
                ApprovedByName = t.ApprovedByUser != null ? t.ApprovedByUser.FullName : null,
                Notes = t.Notes,
                RejectionReason = t.RejectionReason,
                RequestedAt = t.RequestedAt,
                ApprovedAt = t.ApprovedAt,
                ShippedAt = t.ShippedAt,
                ReceivedAt = t.ReceivedAt,
                RejectedAt = t.RejectedAt,
                Items = t.Items.Select(i => new TransferItemDto
                {
                    StockTransferItemId = i.StockTransferItemId,
                    ProductId = i.ProductId,
                    ProductName = i.Product.Name,
                    SKU = i.Product.SKU,
                    BatchId = i.BatchId,
                    BatchNumber = i.Batch != null ? i.Batch.BatchNumber : null,
                    RequestedQuantity = i.RequestedQuantity,
                    ApprovedQuantity = i.ApprovedQuantity,
                    ShippedQuantity = i.ShippedQuantity,
                    ReceivedQuantity = i.ReceivedQuantity
                }).ToList()
            });
}
