// Mirrors ProposalStatus ordinals from StockPilot.Procurement.Domain.Enums — kept in sync
// with web/stockpilot-web/src/utils/procurementEnums.js.
enum ProposalStatus {
  draft,
  pendingApproval,
  approved,
  rejected,
  revisionRequested,
  converted;

  static ProposalStatus fromCode(int code) => ProposalStatus.values[code];
}

/// Mirrors ProposalSummaryResponse (Application/Procurement/Dtos/Proposals/ProposalResponses.cs).
class ProposalSummary {
  final String id;
  final String branchId;
  final String supplierId;
  final String createdByUserId;
  final ProposalStatus status;
  final double totalEstimatedCost;
  final DateTime updatedAt;

  const ProposalSummary({
    required this.id,
    required this.branchId,
    required this.supplierId,
    required this.createdByUserId,
    required this.status,
    required this.totalEstimatedCost,
    required this.updatedAt,
  });

  factory ProposalSummary.fromJson(Map<String, dynamic> json) => ProposalSummary(
        id: json['id'] ?? '',
        branchId: json['branchId'] ?? '',
        supplierId: json['supplierId'] ?? '',
        createdByUserId: json['createdByUserId'] ?? '',
        status: ProposalStatus.fromCode((json['status'] as num?)?.toInt() ?? 0),
        totalEstimatedCost: (json['totalEstimatedCost'] as num?)?.toDouble() ?? 0.0,
        updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      );
}
