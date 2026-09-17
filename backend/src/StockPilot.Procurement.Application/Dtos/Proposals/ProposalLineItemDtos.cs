namespace StockPilot.Procurement.Application.Dtos.Proposals;

public record ProposalLineItemRequest(Guid ProductId, int Quantity, decimal UnitPrice);

public record ProposalLineItemResponse(Guid Id, Guid ProductId, string ProductName, int Quantity, decimal UnitPrice, decimal LineTotal);
