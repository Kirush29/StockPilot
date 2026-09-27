// Cross-platform end-to-end run, Flutter side (final status). Not part of the normal `flutter test` run: it
// only executes when E2E_API_URL is defined, and is driven by scripts/e2e/run-replenishment-e2e.sh after
// the React stages have started the multi-agent replenishment run, approved it, and received the order.
//
//   stage "verify": a Branch Manager signs in on mobile and sees, through the same service calls the
//                   Replenishment screen and the Purchase Orders screen use, that the run's proposal was
//                   approved and converted, and that its purchase order was received.
//
// State is handed between stages through the JSON file at E2E_STATE_FILE.
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/core/api/api_client.dart';
import 'package:stockpilot_mobile/modules/procurement/models/purchase_order.dart';
import 'package:stockpilot_mobile/modules/procurement/services/procurement_api_service.dart';

const apiUrl = String.fromEnvironment('E2E_API_URL');
const stage = String.fromEnvironment('E2E_STAGE', defaultValue: 'verify');
const stateFile = String.fromEnvironment('E2E_STATE_FILE');

// Dev account seeded by StockPilot.API in the Development environment.
const branchManager = 'branch@stockpilot.local';
const devPassword = 'DevPassword123!';

/// An [ApiClient] with a fixed base URL and bearer token (Dio's native adapter bypasses flutter_test's HTTP stub).
ApiClient _e2eApiClient(String baseUrl, String token) {
  final client = ApiClient();
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
  final skip = apiUrl.isEmpty ? 'Set --dart-define=E2E_API_URL=... (see scripts/e2e/run-replenishment-e2e.sh).' : null;

  setUpAll(() {
    // ApiClient's first interceptor reads the token from flutter_secure_storage, which has no
    // platform implementation under `flutter test`; an in-memory store stands in for it.
    FlutterSecureStorage.setMockInitialValues({});
  });

  test('verify: on mobile, the Branch Manager sees the run approved, converted and received', () async {
    final state = jsonDecode(File(stateFile).readAsStringSync()) as Map<String, dynamic>;

    final login = await Dio(BaseOptions(baseUrl: apiUrl))
        .post('/api/auth/login', data: {'emailOrUsername': branchManager, 'password': devPassword});
    final token = (login.data as Map<String, dynamic>)['accessToken'] as String;
    final api = ProcurementApiService(_e2eApiClient(apiUrl, token));

    final run = await api.getReplenishment(state['workflowId'] as String);
    expect(run.result!.status, 'PendingApproval'); // the orchestrator stopped for a human
    expect(run.result!.decision, 'Reorder');
    expect(run.result!.orderQuantity, state['orderQuantity']);
    expect(run.liveProposalStatus, 'Converted'); // the human approved; the proposal became an order
    expect(run.steps.where((s) => s.status == 'Completed'), hasLength(6));

    final order = await api.getOrderById(state['purchaseOrderId'] as String);
    expect(order.status, PurchaseOrderStatus.received);

    // ignore: avoid_print
    print('E2E verify: mobile sees run ${state['workflowId']} -> proposal ${run.liveProposalStatus}, '
        'order ${state['orderNumber']} ${order.status.label}');
  }, skip: skip ?? (stage == 'verify' ? null : 'verify stage not selected'));
}
