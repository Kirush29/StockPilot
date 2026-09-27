import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/modules/procurement/screens/purchase_order_status_screen.dart';

import 'fake_procurement_backend.dart';

void main() {
  Future<void> pumpScreen(
      WidgetTester tester, FakeProcurementBackend backend) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
            home: PurchaseOrderStatusScreen(apiService: backend.service())),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
      'lists orders with their status and offers Receive only for open orders',
      (tester) async {
    final backend = FakeProcurementBackend([
      orderJson(
          id: 'o-1', number: 'PO-2026-000001', status: 0, totalCost: 1500),
      orderJson(
          id: 'o-2', number: 'PO-2026-000002', status: 1, totalCost: 220.5),
      orderJson(id: 'o-3', number: 'PO-2026-000003', status: 2, totalCost: 80),
      orderJson(id: 'o-4', number: 'PO-2026-000004', status: 3, totalCost: 99),
    ]);

    await pumpScreen(tester, backend);

    for (final text in [
      'PO-2026-000001',
      'PO-2026-000004',
      'Ordered',
      'Partially Received',
      'Received',
      'Cancelled',
    ]) {
      expect(find.text(text), findsOneWidget, reason: text);
    }
    expect(find.textContaining('\$1500.00'), findsOneWidget);
    expect(find.text('Receive'), findsNWidgets(2),
        reason: 'only Ordered and PartiallyReceived can be received');
  });

  testWidgets('shows a spinner while loading', (tester) async {
    final backend =
        FakeProcurementBackend([orderJson(id: 'o-1', number: 'PO-1')]);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
            home: PurchaseOrderStatusScreen(apiService: backend.service())),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('shows the empty state when there are no orders', (tester) async {
    await pumpScreen(tester, FakeProcurementBackend([]));

    expect(find.text('No Purchase Orders'), findsOneWidget);
    expect(find.text('Nothing has been ordered yet.'), findsOneWidget);
  });

  testWidgets('shows the server error and recovers on Retry', (tester) async {
    final backend =
        FakeProcurementBackend([orderJson(id: 'o-1', number: 'PO-2026-000001')])
          ..failWithStatus = 500;

    await pumpScreen(tester, backend);
    expect(find.text('Something went wrong.'), findsOneWidget);

    backend.failWithStatus = null;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('PO-2026-000001'), findsOneWidget);
  });

  testWidgets('filtering by status re-queries the API with that status',
      (tester) async {
    final backend = FakeProcurementBackend([
      orderJson(id: 'o-1', number: 'PO-2026-000001', status: 0),
      orderJson(id: 'o-3', number: 'PO-2026-000003', status: 2),
    ]);
    await pumpScreen(tester, backend);

    await tester.tap(find.text('All statuses'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Received').last);
    await tester.pumpAndSettle();

    // Should show only Received orders
    expect(find.text('PO-2026-000003'), findsOneWidget);
    expect(find.text('PO-2026-000001'), findsNothing);
  });
}
