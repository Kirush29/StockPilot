// Cross-client end-to-end run, Flutter side. Not part of the normal `flutter test` run: it only
// executes when E2E_API_URL is defined, and is driven by scripts/e2e/run-procurement-cross-client.sh:
//
//   stage "initiate": a Branch Manager signs in on mobile and asks the Procurement Coordinator
//                     Agent to reorder toner  -> API -> PostgreSQL -> agent -> PendingApproval.
//   (React stage)   : a Procurement Manager approves it in the web app.
//   stage "verify"  : back on mobile, the initiator sees the decision, the same way
//                     ProposalDecisionWatcher does (their proposals, filtered by createdByUserId).
//
// State is handed between stages through the JSON file at E2E_STATE_FILE.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:stockpilot_mobile/procurement/models/agent_workflow.dart';
import 'package:stockpilot_mobile/procurement/models/proposal_summary.dart';
import 'package:stockpilot_mobile/procurement/services/procurement_api_service.dart';
import 'package:stockpilot_mobile/shared/services/auth_api_service.dart';

const apiUrl = String.fromEnvironment('E2E_API_URL');
const stage = String.fromEnvironment('E2E_STAGE', defaultValue: 'initiate');
const stateFile = String.fromEnvironment('E2E_STATE_FILE');

// Dev accounts seeded by StockPilot.API in the Development environment; demo data from the procurement stubs.
const branchManager = 'branch@stockpilot.local';
const devPassword = 'DevPassword123!';
const colomboBranch = '11111111-1111-1111-1111-111111111111';
const acmeSupplier = '22222222-2222-2222-2222-222222222222';
const tonerProduct = '44444444-4444-4444-4444-444444444444';
const tonerQuotation = '33333333-3333-3333-3333-333333333334';

void main() {
  final skip = apiUrl.isEmpty ? 'Set --dart-define=E2E_API_URL=... (see scripts/e2e/run-procurement-cross-client.sh).' : null;

  setUpAll(() {
    // flutter_test replaces HttpClient with a stub that answers 400; this stage needs the real network.
    HttpOverrides.global = null;
  });

  Future<(ProcurementApiService, String)> signIn() async {
    final auth = await AuthApiService(baseUrl: apiUrl).login(branchManager, devPassword);
    expect(auth.user.role, 'BranchManager');
    final api = ProcurementApiService(baseUrl: apiUrl, authHeaders: () => {'Authorization': 'Bearer ${auth.accessToken}'});
    return (api, auth.accessToken);
  }

  test('initiate: Branch Manager asks the agent to reorder from the mobile app', () async {
    final (api, _) = await signIn();

    final result = await api.startReorderWorkflow(const ReorderWorkflowRequest(
      triggerType: 'LowStock',
      productId: tonerProduct,
      branchId: colomboBranch,
      suggestedQuantity: 4,
      candidateSupplierId: acmeSupplier,
      quotationId: tonerQuotation,
      sourceAgent: 'InventoryOptimizationAgent',
    ));

    expect(result.status, 'PendingApproval', reason: result.errors.join('; '));
    expect(result.proposalId, isNotNull);
    final status = await api.getWorkflow(result.workflowId);
    expect(status.proposalStatus, 'PendingApproval');
    expect(status.approvalStatus, 'PendingApproval');

    File(stateFile).writeAsStringSync(jsonEncode({'workflowId': result.workflowId, 'proposalId': result.proposalId}));
    // ignore: avoid_print
    print('E2E initiate: workflow ${result.workflowId} created proposal ${result.proposalId} (PendingApproval)');
  }, skip: skip ?? (stage == 'initiate' ? null : 'initiate stage not selected'));

  test('verify: the initiator sees the approval made in the web app', () async {
    final state = jsonDecode(File(stateFile).readAsStringSync()) as Map<String, dynamic>;
    final auth = await AuthApiService(baseUrl: apiUrl).login(branchManager, devPassword);
    final api = ProcurementApiService(baseUrl: apiUrl, authHeaders: () => {'Authorization': 'Bearer ${auth.accessToken}'});

    AgentWorkflowStatus? status;
    final deadline = DateTime.now().add(const Duration(seconds: 30));
    while (DateTime.now().isBefore(deadline)) {
      status = await api.getWorkflow(state['workflowId'] as String);
      if (status.proposalStatus == 'Approved') break;
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    expect(status?.proposalStatus, 'Approved');
    expect(status?.approvalStatus, 'Approved');

    // The exact query ProposalDecisionWatcher polls: my proposals, newest first.
    final response = await http.get(
      Uri.parse('$apiUrl/api/procurement/proposals?pageSize=50&sort=-updatedAt'),
      headers: {'Authorization': 'Bearer ${auth.accessToken}'},
    );
    expect(response.statusCode, 200);
    final mine = ((jsonDecode(response.body) as Map<String, dynamic>)['items'] as List<dynamic>)
        .map((i) => ProposalSummary.fromJson(i as Map<String, dynamic>))
        .where((p) => p.createdByUserId == auth.user.userId);
    final proposal = mine.singleWhere((p) => p.id == state['proposalId']);
    expect(proposal.status, ProposalStatus.approved);
    // ignore: avoid_print
    print('E2E verify: initiator ${auth.user.userId} sees proposal ${proposal.id} as Approved');
  }, skip: skip ?? (stage == 'verify' ? null : 'verify stage not selected'));
}
