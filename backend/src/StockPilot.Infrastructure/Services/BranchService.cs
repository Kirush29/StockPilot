using Microsoft.EntityFrameworkCore;
using StockPilot.Application.DTOs.Branch;
using StockPilot.Application.Interfaces;
using StockPilot.Domain.Entities;
using StockPilot.Domain.Exceptions;
using StockPilot.Infrastructure.Data;

namespace StockPilot.Infrastructure.Services;

public class BranchService(StockPilotDbContext db, ICurrentUserService currentUserService) : IBranchService
{
    public async Task<List<BranchDto>> GetAllAsync(bool includeInactive = false)
    {
        var role = currentUserService.Role;
        var isOwnerOrProcurement = role is "BusinessOwner" or "ProcurementManager";

        return await db.Branches
            .Where(b => (isOwnerOrProcurement || b.IsActive)
                     && (isOwnerOrProcurement || !currentUserService.BranchId.HasValue || b.BranchId == currentUserService.BranchId.Value)
                     && (includeInactive || b.IsActive))
            .OrderBy(b => b.Name)
            .Select(b => new BranchDto
            {
                BranchId = b.BranchId,
                BranchCode = b.BranchCode,
                Name = b.Name,
                Address = b.Address,
                City = b.City,
                PhoneNumber = b.PhoneNumber,
                Email = b.Email,
                ManagerName = b.ManagerName,
                IsActive = b.IsActive,
            })
            .ToListAsync();
    }

    public async Task<BranchDto> GetByIdAsync(Guid id)
    {
        var role = currentUserService.Role;
        var isOwnerOrProcurement = role is "BusinessOwner" or "ProcurementManager";

        if (!isOwnerOrProcurement && currentUserService.BranchId.HasValue && currentUserService.BranchId.Value != id)
        {
            throw new ForbiddenException("You do not have access to view this branch.");
        }

        var branch = await db.Branches
            .Where(b => b.BranchId == id && (isOwnerOrProcurement || b.IsActive))
            .Select(b => new BranchDto
            {
                BranchId = b.BranchId,
                BranchCode = b.BranchCode,
                Name = b.Name,
                Address = b.Address,
                City = b.City,
                PhoneNumber = b.PhoneNumber,
                Email = b.Email,
                ManagerName = b.ManagerName,
                IsActive = b.IsActive,
            })
            .FirstOrDefaultAsync();

        if (branch == null) throw new KeyNotFoundException("Branch not found.");
        return branch;
    }

    public async Task<BranchDto> CreateAsync(CreateBranchDto dto)
    {
        if (currentUserService.Role != "BusinessOwner")
            throw new ForbiddenException("Only the business owner can create branches.");

        if (await db.Branches.AnyAsync(b => b.BranchCode == dto.BranchCode))
        {
            throw new ArgumentException("This branch code is already in use.");
        }

        var branch = new Branch
        {
            BranchId = Guid.NewGuid(),
            BranchCode = dto.BranchCode,
            Name = dto.Name,
            Address = dto.Address,
            City = dto.City,
            PhoneNumber = dto.PhoneNumber,
            Email = dto.Email,
            ManagerName = dto.ManagerName,
            IsActive = dto.IsActive
        };

        db.Branches.Add(branch);
        await db.SaveChangesAsync();

        return await GetByIdAsync(branch.BranchId);
    }

    public async Task<BranchDto> UpdateAsync(Guid id, UpdateBranchDto dto)
    {
        if (currentUserService.Role != "BusinessOwner")
            throw new ForbiddenException("Only the business owner can update branches.");

        var branch = await db.Branches.FindAsync(id);
        if (branch == null) throw new KeyNotFoundException("Branch not found.");

        branch.Name = dto.Name;
        branch.Address = dto.Address;
        branch.City = dto.City;
        branch.PhoneNumber = dto.PhoneNumber;
        branch.Email = dto.Email;
        branch.ManagerName = dto.ManagerName;
        branch.IsActive = dto.IsActive;
        branch.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<BranchDto> ToggleStatusAsync(Guid id, bool isActive)
    {
        if (currentUserService.Role != "BusinessOwner")
            throw new ForbiddenException("Only the business owner can toggle branch status.");

        var branch = await db.Branches.FindAsync(id);
        if (branch == null) throw new KeyNotFoundException("Branch not found.");
        branch.IsActive = isActive;
        branch.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task DeactivateAsync(Guid id)
    {
        if (currentUserService.Role != "BusinessOwner")
            throw new ForbiddenException("Only the business owner can deactivate branches.");

        var branch = await db.Branches.FindAsync(id);
        if (branch == null) throw new KeyNotFoundException("Branch not found.");

        branch.IsActive = false;
        branch.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
