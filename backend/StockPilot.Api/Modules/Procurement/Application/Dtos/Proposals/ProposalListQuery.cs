using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Proposals;

/// <summary>
/// Filter/sort/paging options for listing proposals. <see cref="Sort"/> accepts one of
/// createdAt, updatedAt, totalEstimatedCost, status, optionally prefixed with "-" for descending
/// (e.g. "-createdAt"). Unrecognized values fall back to "-createdAt".
/// </summary>
public record ProposalListQuery(
    ProposalStatus? Status,
    Guid? SupplierId,
    Guid? BranchId,
    int Page = 1,
    int PageSize = 20,
    string Sort = "-createdAt");
