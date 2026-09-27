import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/features/procurement/screens/delivery_receiving_screen.dart';
import 'package:stockpilot_mobile/features/procurement/screens/purchase_order_status_screen.dart';

import 'fake_procurement_backend.dart';

void main() {
  testWidgets(
      'Receive opens the receiving screen; confirming returns and refreshes the list',
      (tester) async {
    final backend = FakeProcurementBackend([
      orderJson(
          id: 'o-1',
          number: 'PO-2026-000011',
          status: 0,
          lines: [lineJson('toner-0001', 3)]),
    ]);
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
            home: PurchaseOrderStatusScreen(apiService: backend.service())),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Receive'));
    await tester.pumpAndSettle();

    expect(find.byType(DeliveryReceivingScreen), findsOneWidget);
    expect(find.text('Receive PO-2026-000011'), findsOneWidget);

    await tester.tap(find.text('Mark all as received'));
    await tester.pump();
    await tester.tap(find.text('Confirm Full Receipt'));
    await tester.pumpAndSettle();

    expect(find.byType(DeliveryReceivingScreen), findsNothing);
    expect(find.byType(PurchaseOrderStatusScreen), findsOneWidget);
    expect(find.text('Order marked as Received.'), findsOneWidget);
    expect(find.text('Received'), findsOneWidget,
        reason: 'the list reloaded after the screen popped with true');
    expect(find.text('Receive'), findsNothing);
    // Both list GETs should have been recorded
    expect(
        backend.requests
            .where((r) => r.startsWith('GET') && r.contains('orders')),
        hasLength(greaterThanOrEqualTo(2)));
  });

  testWidgets('backing out without confirming does not reload the list',
      (tester) async {
    final backend = FakeProcurementBackend([
      orderJson(
          id: 'o-1',
          number: 'PO-2026-000012',
          status: 1,
          lines: [lineJson('toner-0001', 3)]),
    ]);
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
            home: PurchaseOrderStatusScreen(apiService: backend.service())),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Receive'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    expect(find.byType(PurchaseOrderStatusScreen), findsOneWidget);
    expect(backend.requests.where((r) => r.contains('PATCH')), isEmpty);
  });
}
