import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/modules/procurement/models/purchase_order.dart';
import 'package:stockpilot_mobile/modules/procurement/services/procurement_api_service.dart';

import 'fake_procurement_backend.dart';

void main() {
  group('ProcurementApiService against mocked procurement endpoints', () {
    late FakeProcurementBackend backend;
    late ProcurementApiService api;

    setUp(() {
      backend = FakeProcurementBackend([
        orderJson(
            id: 'o-1',
            number: 'PO-2026-000001',
            status: 0,
            lines: [lineJson('prod-aaaa-1111', 10)]),
        orderJson(id: 'o-2', number: 'PO-2026-000002', status: 2),
      ]);
      api = backend.service();
    });

    test('lists orders with page size', () async {
      final orders = await api.getOrders();

      expect(orders.map((o) => o.orderNumber),
          ['PO-2026-000001', 'PO-2026-000002']);
      expect(backend.requests.single, contains('/api/procurement/orders'));
    });

    test('sends the status filter as the backend enum ordinal', () async {
      final orders = await api.getOrders(status: PurchaseOrderStatus.received);

      expect(orders.single.status, PurchaseOrderStatus.received);
      expect(backend.requests.single, contains('orders'));
    });

    test('parses order detail with line items', () async {
      final order = await api.getOrderById('o-1');

      expect(order.lineItems.single.productId, 'prod-aaaa-1111');
      expect(order.totalUnitsOrdered, 10);
      expect(order.status, PurchaseOrderStatus.ordered);
    });

    test('PATCHes a status change', () async {
      final updated = await api.updateOrderStatus(
          'o-1',
          const UpdateOrderStatusPayload(
              status: PurchaseOrderStatus.partiallyReceived, notes: 'half'));

      expect(updated.status, PurchaseOrderStatus.partiallyReceived);
    });

    test('throws ProcurementApiException for a missing order', () async {
      final result = api.getOrderById('missing');

      await expectLater(
        result,
        throwsA(isA<ProcurementApiException>()
            .having((e) => e.statusCode, 'statusCode', 404)),
      );
    });

    test('maps a server error to ProcurementApiException', () async {
      backend.failWithStatus = 409;
      backend.failBody =
          '{"title":"Invalid state transition","detail":"Cannot move PurchaseOrder from Received to Cancelled."}';

      await expectLater(
        api.updateOrderStatus(
            'o-2',
            const UpdateOrderStatusPayload(
                status: PurchaseOrderStatus.cancelled)),
        throwsA(isA<ProcurementApiException>()),
      );
    });

    test('gives readable message for 401', () async {
      backend.failWithStatus = 401;
      backend.failBody = '';

      await expectLater(
        api.getOrders(),
        throwsA(isA<ProcurementApiException>()
            .having((e) => e.message, 'message', contains('Session expired'))),
      );
    });
  });
}
