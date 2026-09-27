import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/core/api/api_client.dart';
import 'package:stockpilot_mobile/core/errors/api_exception.dart';
import 'package:stockpilot_mobile/shared/auth/providers/auth_provider.dart';
import 'package:stockpilot_mobile/modules/procurement/models/replenishment_workflow.dart';
import 'package:stockpilot_mobile/modules/procurement/screens/replenishment_screen.dart';
import 'package:stockpilot_mobile/modules/procurement/services/procurement_api_service.dart';

const branch = '11111111-1111-1111-1111-111111111111';
const product = '18464716-8fa7-49da-b521-08b1dc057c28';
const run = 'aaaaaaaa-0000-4000-8000-000000000001';
const proposal = 'cccccccc-0000-4000-8000-000000000001';

/// An ApiClient answering from a handler. A handler returning an [ApiException] makes the call throw it,
/// as the real ApiClient does for 4xx/5xx responses.
class _FakeApiClient extends ApiClient {
  final List<Map<String, dynamic>> requests = [];
  final dynamic Function(String method, String path, dynamic body) handler;

  _FakeApiClient(this.handler) : super();

  dynamic _answer(String method, String path, dynamic body) {
    requests.add({'method': method, 'path': path, 'body': body});
    final response = handler(method, path, body);
    if (response is Exception) throw response;
    return response;
  }

  @override
  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async => _answer('GET', path, queryParameters);

  @override
  Future<dynamic> post(String path, {dynamic data}) async => _answer('POST', path, data);
}

Map<String, dynamic> resultJson({String status = 'PendingApproval'}) => {
      'workflowId': run,
      'status': status,
      'decision': 'Reorder',
      'orderQuantity': 293,
      'forecastReorderQuantity': 293,
      'inventoryShortageQuantity': 110,
      'proposalId': status == 'PendingApproval' ? proposal : null,
      'humanApprovalRequired': status == 'PendingApproval',
      'nextAction': 'Approve or reject proposal $proposal.',
      'childWorkflows': {'procurementWorkflowId': 'bbbbbbbb-0000-4000-8000-000000000001'},
      'errors': status == 'ChecksFailed' ? ['Budget exceeded.'] : [],
    };

Map<String, dynamic> detailJson(String liveStatus) => {
      'workflowId': run,
      'liveProposalStatus': liveStatus,
      'result': resultJson(),
      'steps': [
        {'stepIndex': 0, 'action': 'Plan: validate the objective', 'status': 'Completed'},
        {'stepIndex': 1, 'action': 'Delegate to Inventory Optimization Agent', 'status': 'Completed', 'detail': 'Reorder recommended (LowStock).'},
        {'stepIndex': 5, 'action': 'Stop for human approval', 'status': 'Completed'},
      ],
    };

void main() {
  group('ProcurementApiService — replenishment orchestrator', () {
    test('start posts the contract payload and returns the result', () async {
      final client = _FakeApiClient((method, path, body) => resultJson());

      final result = await ProcurementApiService(client)
          .startReplenishment(const ReplenishmentRequest(branchId: branch, productId: product));

      expect(client.requests.single['path'], '/api/agent-workflows/replenishment/start');
      expect(client.requests.single['body'], {'branchId': branch, 'productId': product});
      expect(result.status, 'PendingApproval');
      expect(result.orderQuantity, 293);
      expect(result.proposalId, proposal);
    });

    test('a 422 from the real ApiClient error path still comes back as a result', () async {
      final client = _FakeApiClient((method, path, body) =>
          ApiException(message: 'Unprocessable', statusCode: 422, data: resultJson(status: 'ChecksFailed')));

      final result = await ProcurementApiService(client)
          .startReplenishment(const ReplenishmentRequest(branchId: branch, productId: product));

      expect(result.status, 'ChecksFailed');
      expect(result.errors.single, 'Budget exceeded.');
    });

    test('a 403 stays an error', () async {
      final client = _FakeApiClient((method, path, body) => DioException(
            requestOptions: RequestOptions(path: path),
            response: Response(requestOptions: RequestOptions(path: path), statusCode: 403, data: {'detail': 'Forbidden'}),
            type: DioExceptionType.badResponse,
          ));

      await expectLater(
        ProcurementApiService(client).startReplenishment(const ReplenishmentRequest(branchId: branch, productId: product)),
        throwsA(isA<ProcurementApiException>().having((e) => e.statusCode, 'status', 403)),
      );
    });

    test('detail exposes the steps and the live proposal status', () async {
      final client = _FakeApiClient((method, path, body) => detailJson('Approved'));

      final detail = await ProcurementApiService(client).getReplenishment(run);

      expect(detail.liveProposalStatus, 'Approved');
      expect(detail.steps, hasLength(3));
      expect(detail.result!.decision, 'Reorder');
    });
  });

  testWidgets('ReplenishmentScreen runs the agents, shows the outcome and refreshes to Approved', (tester) async {
    var live = 'PendingApproval';
    final client = _FakeApiClient((method, path, body) {
      if (path == '/api/branches') return {'success': true, 'data': [{'branchId': branch, 'name': 'Colombo Central Branch'}]};
      if (path == '/api/products') return {'success': true, 'data': [{'productId': product, 'name': 'Paracetamol 500mg', 'sku': 'SKU-PARA'}]};
      if (path == '/api/agent-workflows/replenishment/start') return resultJson();
      if (path == '/api/agent-workflows/replenishment/$run') return detailJson(live);
      throw StateError('unexpected $method $path');
    });

    await tester.pumpWidget(ProviderScope(
      overrides: [apiClientProvider.overrideWithValue(client)],
      child: const MaterialApp(home: ReplenishmentScreen()),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('replenishment-branch')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Colombo Central Branch').last);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('replenishment-product')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Paracetamol 500mg (SKU-PARA)').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Run replenishment check'));
    await tester.pumpAndSettle();

    expect(find.text('Proposal awaiting approval'), findsOneWidget);
    expect(find.text('Order quantity: 293'), findsOneWidget);
    expect(find.text('Reorder recommended (LowStock).'), findsOneWidget);
    expect(find.text('Proposal status: PendingApproval'), findsOneWidget);
    final start = client.requests.firstWhere((r) => r['path'] == '/api/agent-workflows/replenishment/start');
    expect(start['body'], {'branchId': branch, 'productId': product});

    live = 'Approved';
    await tester.ensureVisible(find.text('Refresh status'));
    await tester.tap(find.text('Refresh status'));
    await tester.pumpAndSettle();

    expect(find.text('Proposal status: Approved'), findsOneWidget);
  });

  testWidgets('ReplenishmentScreen asks for a branch and product first', (tester) async {
    final client = _FakeApiClient((method, path, body) => {'success': true, 'data': []});

    await tester.pumpWidget(ProviderScope(
      overrides: [apiClientProvider.overrideWithValue(client)],
      child: const MaterialApp(home: ReplenishmentScreen()),
    ));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Run replenishment check'));
    await tester.pumpAndSettle();

    expect(find.text('Choose a branch and a product.'), findsOneWidget);
    expect(client.requests.where((r) => r['method'] == 'POST'), isEmpty);
  });
}
