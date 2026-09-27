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

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/core/api/api_client.dart';
import 'package:stockpilot_mobile/features/auth/models/user_info.dart';
import 'package:stockpilot_mobile/features/procurement/models/agent_workflow.dart';
import 'package:stockpilot_mobile/features/procurement/models/proposal_summary.dart';
import 'package:stockpilot_mobile/features/procurement/services/procurement_api_service.dart';

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

/// Builds an [ApiClient] with a fixed base URL and bearer token for E2E use
/// (bypasses flutter_test's HttpClient stub by using Dio's native adapter).
ApiClient _e2eApiClient(String baseUrl, String token) {
  final client = ApiClient();
  // Override the base URL and inject a static auth interceptor.
  client.dio.options.baseUrl = baseUrl;
  client.dio.interceptors.add(InterceptorsWrapper(
    onRequest: (opts, handler) {
      opts.headers['Authorization'] = 'Bearer $token';
      handler.next(opts);
    },
  ));
  return client;
}

void main() {
  final skip = apiUrl.isEmpty
      ? 'Set --dart-define=E2E_API_URL=... (see scripts/e2e/run-procurement-cross-client.sh).'
      : null;

  setUpAll(() {
    // Dio uses its own native adapter; no HttpOverrides needed.
  });

  Future<(ProcurementApiService, String, UserInfo)> signIn() async {
    final loginClient = Dio(BaseOptions(baseUrl: apiUrl));
    final loginResponse = await loginClient.post(
      '/api/auth/login',
      data: {'username': branchManager, 'password': devPassword},
    );
    final body = loginResponse.data as Map<String, dynamic>;
    final accessToken = body['accessToken'] as String;
    final user = UserInfo.fromJson(body['user'] as Map<String, dynamic>);
    expect(user.role, 'BranchManager');
    final apiClient = _e2eApiClient(apiUrl, accessToken);
    final api = ProcurementApiService(apiClient);
    return (api, accessToken, user);
  }

  test('initiate: Branch Manager asks the agent to reorder from the mobile app',
      () async {
    final (api, _, _user) = await signIn();

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

    File(stateFile).writeAsStringSync(jsonEncode(
        {'workflowId': result.workflowId, 'proposalId': result.proposalId}));
    // ignore: avoid_print
    print(
        'E2E initiate: workflow ${result.workflowId} created proposal ${result.proposalId} (PendingApproval)');
  },
      skip:
          skip ?? (stage == 'initiate' ? null : 'initiate stage not selected'));

  test('verify: the initiator sees the approval made in the web app', () async {
    final state =
        jsonDecode(File(stateFile).readAsStringSync()) as Map<String, dynamic>;
    final (api, accessToken, user) = await signIn();

    AgentWorkflowStatus? wfStatus;
    final deadline = DateTime.now().add(const Duration(seconds: 30));
    while (DateTime.now().isBefore(deadline)) {
      wfStatus = await api.getWorkflow(state['workflowId'] as String);
      if (wfStatus.proposalStatus == 'Approved') break;
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    expect(wfStatus?.proposalStatus, 'Approved');
    expect(wfStatus?.approvalStatus, 'Approved');

    // The exact query ProposalDecisionWatcher polls: my proposals, newest first.
    final proposalsClient = _e2eApiClient(apiUrl, accessToken);
    final proposalsResponse = await proposalsClient.get(
      '/api/procurement/proposals',
      queryParameters: {'pageSize': '50', 'sort': '-updatedAt'},
    );
    final items =
        (proposalsResponse as Map<String, dynamic>)['items'] as List<dynamic>;
    final mine = items
        .map((i) => ProposalSummary.fromJson(i as Map<String, dynamic>))
        .where((p) => p.createdByUserId == user.userId);
    final proposal = mine.singleWhere((p) => p.id == state['proposalId']);
    expect(proposal.status, ProposalStatus.approved);
    // ignore: avoid_print
    print(
        'E2E verify: initiator ${user.userId} sees proposal ${proposal.id} as Approved');
  }, skip: skip ?? (stage == 'verify' ? null : 'verify stage not selected'));
}

