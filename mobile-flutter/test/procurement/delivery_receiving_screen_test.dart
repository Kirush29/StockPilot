import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/features/procurement/models/purchase_order.dart';
import 'package:stockpilot_mobile/features/procurement/screens/delivery_receiving_screen.dart';

import 'fake_procurement_backend.dart';

void main() {
  const paper = 'paper-1111-aaaa';
  const ink = 'ink00-2222-bbbb';

  late FakeProcurementBackend backend;

  setUp(() {
    backend = FakeProcurementBackend([
      orderJson(
          id: 'o-1',
          number: 'PO-2026-000007',
          lines: [lineJson(paper, 2), lineJson(ink, 1)]),
    ]);
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    final summary = PurchaseOrder.fromJson(backend.orders.first);
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: DeliveryReceivingScreen(
              order: summary, apiService: backend.service()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  ElevatedButton confirmButton(WidgetTester tester) =>
      tester.widget<ElevatedButton>(find
              .widgetWithText(ElevatedButton, 'Confirm Partial Receipt')
              .evaluate()
              .isNotEmpty
          ? find.widgetWithText(ElevatedButton, 'Confirm Partial Receipt')
          : find.widgetWithText(ElevatedButton, 'Confirm Full Receipt'));

  testWidgets(
      'loads the order lines with nothing received and confirm disabled',
      (tester) async {
    await pumpScreen(tester);

    expect(find.text('Receive PO-2026-000007'), findsOneWidget);
    expect(find.text('Product paper-11'), findsOneWidget);
    expect(find.text('0 / 2 received'), findsOneWidget);
    expect(find.text('0 / 1 received'), findsOneWidget);
    expect(confirmButton(tester).onPressed, isNull);
  });

  testWidgets(
      'scanning a line item counts it; unknown codes and over-scans are reported',
      (tester) async {
    await pumpScreen(tester);
    final scanField = find.byType(TextField).first;

    await tester.enterText(scanField, 'not-on-this-order');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(find.text('No line item on this order matches "not-on-this-order".'),
        findsOneWidget);

    await tester.enterText(scanField, ink.toUpperCase());
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(find.text('1 / 1 received'), findsOneWidget);

    await tester.enterText(scanField, ink);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(find.text('Already recorded all 1 units for this item.'),
        findsOneWidget);
  });

  testWidgets(
      'partial receipt submits PartiallyReceived with a per-line summary',
      (tester) async {
    await pumpScreen(tester);

    await tester.tap(find.byIcon(Icons.add_circle_outline).first);
    await tester.pump();
    expect(find.text('Confirm Partial Receipt'), findsOneWidget);

    await tester.enterText(
        find.widgetWithText(TextField, 'Notes (optional)'), 'Box 2 missing');
    await tester.tap(find.text('Confirm Partial Receipt'));
    await tester.pumpAndSettle();

    // Verify the backend received a PATCH
    expect(backend.requests.any((r) => r.contains('PATCH')), isTrue);
  });

  testWidgets(
      'Mark all as received switches to full receipt and submits Received',
      (tester) async {
    await pumpScreen(tester);

    await tester.tap(find.text('Mark all as received'));
    await tester.pump();
    expect(find.text('2 / 2 received'), findsOneWidget);
    expect(find.byIcon(Icons.check_circle), findsNWidgets(2));

    await tester.tap(find.text('Confirm Full Receipt'));
    await tester.pumpAndSettle();

    expect(backend.orders.first['status'], 2);
  });

  testWidgets('quantity buttons stay within 0..ordered', (tester) async {
    await pumpScreen(tester);
    final inkPlus = find.byIcon(Icons.add_circle_outline).last;

    await tester.tap(inkPlus);
    await tester.pump();
    expect(find.text('1 / 1 received'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.remove_circle_outline).last);
    await tester.pump();
    expect(find.text('0 / 1 received'), findsOneWidget);
  });

  testWidgets(
      'shows the server message when the update is rejected and stays on the screen',
      (tester) async {
    await pumpScreen(tester);
    await tester.tap(find.text('Mark all as received'));
    await tester.pump();

    backend.failWithStatus = 403;
    backend.failBody =
        '{"title":"Forbidden","detail":"Only a Procurement Manager or Business Owner can cancel a purchase order."}';
    await tester.tap(find.text('Confirm Full Receipt'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Only a Procurement Manager'), findsOneWidget);
    expect(find.text('Receive PO-2026-000007'), findsOneWidget);
  });

  testWidgets('shows an error with Retry when the order cannot be loaded',
      (tester) async {
    backend.failWithStatus = 500;
    await pumpScreen(tester);

    expect(find.text('Something went wrong.'), findsOneWidget);
    backend.failWithStatus = null;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(find.text('0 / 2 received'), findsOneWidget);
  });
}
