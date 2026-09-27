import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:stockpilot_mobile/shared/navigation/app_shell.dart';
import 'package:stockpilot_mobile/shared/scanning/barcode_scanning.dart';
import 'package:stockpilot_mobile/shared/theme/app_theme.dart';

void main() {
  group('AppShell tab mapping', () {
    test('module screens opened from Home highlight their module tab', () {
      expect(AppShell.indexFor('/home'), 0);
      for (final path in ['/inventory', '/transfers/create', '/scanner', '/ai-insights', '/receive-batch']) {
        expect(AppShell.indexFor(path), 1, reason: path);
      }
      expect(AppShell.indexFor('/sales/demand-alerts'), 2);
      expect(AppShell.indexFor('/replenishment'), 3);
      expect(AppShell.indexFor('/procurement/orders'), 3);
      expect(AppShell.indexFor('/change-password'), 4);
    });

    testWidgets('tapping a tab navigates to that module', (tester) async {
      final router = GoRouter(initialLocation: '/home', routes: [
        ShellRoute(
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            for (final path in ['/home', '/inventory', '/sales/pos', '/procurement/orders', '/profile'])
              GoRoute(path: path, builder: (context, state) => Text('page $path')),
          ],
        ),
      ]);
      await tester.pumpWidget(ProviderScope(child: MaterialApp.router(theme: AppTheme.lightTheme, routerConfig: router)));
      await tester.pumpAndSettle();
      expect(find.text('page /home'), findsOneWidget);

      await tester.tap(find.text('Orders'));
      await tester.pumpAndSettle();
      expect(find.text('page /procurement/orders'), findsOneWidget);

      await tester.tap(find.text('Sales'));
      await tester.pumpAndSettle();
      expect(find.text('page /sales/pos'), findsOneWidget);
    });
  });

  group('ScanInputField (shared scan-or-type input)', () {
    testWidgets('a typed or keyboard-wedge code is submitted trimmed and the field clears', (tester) async {
      final scanned = <String>[];
      await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(body: ScanInputField(label: 'Scan received item', onScan: scanned.add)),
      ));

      await tester.enterText(find.byType(TextField), '  INK-BLK-STD ');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();

      expect(scanned, ['INK-BLK-STD']);
      expect(find.text('INK-BLK-STD'), findsNothing);
      expect(find.byTooltip('Scan with camera'), findsOneWidget);
    });

    testWidgets('an empty code is ignored', (tester) async {
      final scanned = <String>[];
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: ScanInputField(label: 'Scan', onScan: scanned.add)),
      ));

      await tester.tap(find.byTooltip('Add scanned item'));
      await tester.pump();

      expect(scanned, isEmpty);
    });
  });
}
