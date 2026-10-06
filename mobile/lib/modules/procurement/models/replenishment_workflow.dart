// Mirrors the Replenishment Orchestrator contracts:
// agentic-ai/contracts/replenishment-orchestrator/workflow-input.schema.json and workflow-output.schema.json.

class ReplenishmentRequest {
  final String branchId;
  final String productId;
  final int? forecastDays;

  const ReplenishmentRequest({required this.branchId, required this.productId, this.forecastDays});

  Map<String, dynamic> toJson() => {
        'branchId': branchId,
        'productId': productId,
        if (forecastDays != null) 'forecastDays': forecastDays,
      };
}

/// Output of POST /api/agent-workflows/replenishment/start (201, 422 and 503 all carry it).
class ReplenishmentResult {
  final String workflowId;

  /// PendingApproval, TransferRecommended, NoActionRequired, QuantityConflict, NoEligibleSupplier,
  /// ChecksFailed, InvalidInput or Failed.
  final String status;
  final String? decision;
  final int? orderQuantity;
  final num? forecastReorderQuantity;
  final num? inventoryShortageQuantity;
  final String? proposalId;
  final String? procurementWorkflowId;
  final bool humanApprovalRequired;
  final String? nextAction;
  final List<String> errors;

  const ReplenishmentResult({
    required this.workflowId,
    required this.status,
    this.decision,
    this.orderQuantity,
    this.forecastReorderQuantity,
    this.inventoryShortageQuantity,
    this.proposalId,
    this.procurementWorkflowId,
    this.humanApprovalRequired = false,
    this.nextAction,
    this.errors = const [],
  });

  factory ReplenishmentResult.fromJson(Map<String, dynamic> json) => ReplenishmentResult(
        workflowId: json['workflowId']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        decision: json['decision']?.toString(),
        orderQuantity: (json['orderQuantity'] as num?)?.toInt(),
        forecastReorderQuantity: json['forecastReorderQuantity'] as num?,
        inventoryShortageQuantity: json['inventoryShortageQuantity'] as num?,
        proposalId: json['proposalId']?.toString(),
        procurementWorkflowId: (json['childWorkflows'] as Map<String, dynamic>?)?['procurementWorkflowId']?.toString(),
        humanApprovalRequired: json['humanApprovalRequired'] == true,
        nextAction: json['nextAction']?.toString(),
        errors: (json['errors'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      );

  String get statusLabel => const {
        'PendingApproval': 'Proposal awaiting approval',
        'TransferRecommended': 'Transfer recommended',
        'NoActionRequired': 'No action required',
        'QuantityConflict': 'Quantity needs a decision',
        'NoEligibleSupplier': 'No eligible supplier',
        'ChecksFailed': 'Procurement checks failed',
        'InvalidInput': 'Invalid request',
        'Failed': 'Failed',
      }[status] ??
      status;
}

class ReplenishmentStep {
  final int stepIndex;
  final String action;
  final String status;
  final String? detail;

  const ReplenishmentStep({required this.stepIndex, required this.action, required this.status, this.detail});

  factory ReplenishmentStep.fromJson(Map<String, dynamic> json) => ReplenishmentStep(
        stepIndex: (json['stepIndex'] as num?)?.toInt() ?? 0,
        action: json['action']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        detail: json['detail']?.toString(),
      );
}

/// GET /api/agent-workflows/replenishment/{id}: the result, the trace and the live proposal status.
class ReplenishmentDetail {
  final String workflowId;
  final ReplenishmentResult? result;

  /// Live status of the proposal the run created (e.g. PendingApproval, Approved, Rejected), or null.
  final String? liveProposalStatus;
  final List<ReplenishmentStep> steps;

  const ReplenishmentDetail({required this.workflowId, this.result, this.liveProposalStatus, this.steps = const []});

  factory ReplenishmentDetail.fromJson(Map<String, dynamic> json) => ReplenishmentDetail(
        workflowId: json['workflowId']?.toString() ?? '',
        result: json['result'] is Map<String, dynamic> ? ReplenishmentResult.fromJson(json['result'] as Map<String, dynamic>) : null,
        liveProposalStatus: json['liveProposalStatus']?.toString(),
        steps: (json['steps'] as List<dynamic>? ?? [])
            .map((s) => ReplenishmentStep.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}
