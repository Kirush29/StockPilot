// Mirrors the Procurement Coordinator Agent contracts:
// agentic-ai/contracts/procurement-coordinator/workflow-input.schema.json and workflow-output.schema.json.

class ReorderWorkflowRequest {
  final String triggerType;
  final String productId;
  final String branchId;
  final int suggestedQuantity;
  final String candidateSupplierId;
  final String quotationId;
  final String sourceAgent;

  const ReorderWorkflowRequest({
    required this.triggerType,
    required this.productId,
    required this.branchId,
    required this.suggestedQuantity,
    required this.candidateSupplierId,
    required this.quotationId,
    this.sourceAgent = 'Manual',
  });

  Map<String, dynamic> toJson() => {
        'triggerType': triggerType,
        'productId': productId,
        'branchId': branchId,
        'suggestedQuantity': suggestedQuantity,
        'candidateSupplierId': candidateSupplierId,
        'quotationId': quotationId,
        'sourceAgent': sourceAgent,
      };
}

/// Output of POST /api/agent-workflows/procurement/start.
class AgentWorkflowResult {
  final String workflowId;
  final String? proposalId;

  /// PendingApproval, ChecksFailed, InvalidInput or Failed.
  final String status;
  final List<String> errors;

  const AgentWorkflowResult({required this.workflowId, this.proposalId, required this.status, this.errors = const []});

  bool get isPendingApproval => status == 'PendingApproval';

  factory AgentWorkflowResult.fromJson(Map<String, dynamic> json) => AgentWorkflowResult(
        workflowId: json['workflowId'] ?? '',
        proposalId: json['proposalId'],
        status: json['status'] ?? '',
        errors: (json['errors'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      );
}

/// Subset of GET /api/agent-workflows/{id} the mobile app needs.
class AgentWorkflowStatus {
  final String workflowId;
  final String status;
  final String approvalStatus;
  final String? proposalId;

  /// Live status of the proposal (e.g. PendingApproval, Approved, Rejected), or null if none was created.
  final String? proposalStatus;

  const AgentWorkflowStatus({
    required this.workflowId,
    required this.status,
    required this.approvalStatus,
    this.proposalId,
    this.proposalStatus,
  });

  factory AgentWorkflowStatus.fromJson(Map<String, dynamic> json) => AgentWorkflowStatus(
        workflowId: json['workflowId'] ?? '',
        status: json['status'] ?? '',
        approvalStatus: json['approvalStatus'] ?? '',
        proposalId: json['proposalId'],
        proposalStatus: json['proposalStatus'],
      );
}
