using StockPilot.Procurement.Domain.Enums;

namespace StockPilot.Procurement.Application.Dtos.Proposals;

public record DecisionRequest(ApprovalDecisionType Decision, string? Comment);
