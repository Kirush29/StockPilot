import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:stockpilot_mobile/procurement/models/purchase_order.dart';
import 'package:stockpilot_mobile/procurement/services/procurement_api_service.dart';

import 'fake_procurement_backend.dart';

void main() {
  group('ProcurementApiService against mocked procurement endpoints', () {
    late FakeProcurementBackend backend;
    late ProcurementApiService api;

    setUp(() {
      backend = FakeProcurementBackend([
        orderJson(id: 'o-1', number: 'PO-2026-000001', status: 0, lines: [lineJson('prod-aaaa-1111', 10)]),
        orderJson(id: 'o-2', number: 'PO-2026-000002', status: 2),
      ]);
      api = backend.service();
    });

    test('lists orders with auth header and page size', () async {
      final orders = await api.getOrders();

      expect(orders.map((o) => o.orderNumber), ['PO-2026-000001', 'PO-2026-000002']);
      final request = backend.requests.single;
      expect(request.url.toString(), 'http://api.test/api/procurement/orders?pageSize=50');
      expect(request.headers['Authorization'], 'Bearer test-token');
    });

    test('sends the status filter as the backend enum ordinal', () async {
      final orders = await api.getOrders(status: PurchaseOrderStatus.received);

      expect(backend.requests.single.url.queryParameters['status'], '2');
      expect(orders.single.status, PurchaseOrderStatus.received);
    });

    test('parses order detail with line items', () async {
      final order = await api.getOrderById('o-1');

      expect(order.lineItems.single.productId, 'prod-aaaa-1111');
      expect(order.totalUnitsOrdered, 10);
      expect(order.status, PurchaseOrderStatus.ordered);
    });

    test('PATCHes a status change as JSON with the enum ordinal', () async {
      await api.updateOrderStatus('o-1', const UpdateOrderStatusPayload(status: PurchaseOrderStatus.partiallyReceived, notes: 'half'));

      final request = backend.requests.single;
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/procurement/orders/o-1/status');
      expect(request.headers['Content-Type'], startsWith('application/json'));
      expect(jsonDecode(request.body), {'status': 1, 'notes': 'half'});
    });

    test('uses ProblemDetails.detail as the error message', () async {
      final result = api.getOrderById('missing');

      await expectLater(
        result,
        throwsA(isA<ProcurementApiException>()
            .having((e) => e.statusCode, 'statusCode', 404)
            .having((e) => e.message, 'message', 'Purchase order not found.')),
      );
    });

    test('maps an invalid transition (409) to its detail', () async {
      backend.failWithStatus = 409;
      backend.failBody = '{"title":"Invalid state transition","detail":"Cannot move PurchaseOrder from Received to Cancelled."}';

      await expectLater(
        api.updateOrderStatus('o-2', const UpdateOrderStatusPayload(status: PurchaseOrderStatus.cancelled)),
        throwsA(isA<ProcurementApiException>().having((e) => e.message, 'message', contains('Received to Cancelled'))),
      );
    });

    test('gives readable messages for non-JSON 401 and 403 bodies', () async {
      Future<ProcurementApiException> errorFor(int status) async {
        final service = ProcurementApiService(client: MockClient((_) async => http.Response('', status)), baseUrl: 'http://api.test');
        try {
          await service.getOrders();
        } on ProcurementApiException catch (e) {
          return e;
        }
        fail('expected an exception');
      }

      expect((await errorFor(401)).message, 'Session expired. Please sign in again.');
      expect((await errorFor(403)).message, 'You do not have permission to do that.');
      expect((await errorFor(500)).message, 'Request failed (500).');
    });
  });
}
