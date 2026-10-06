import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/providers/auth_provider.dart';
import '../auth/screens/splash_screen.dart';
import '../auth/screens/login_screen.dart';
import 'app_shell.dart';
import 'dashboard/screens/management_only_screen.dart';
import '../auth/profile/screens/profile_screen.dart';
import '../auth/profile/screens/change_password_screen.dart';
import '../../modules/inventory/inventory/screens/inventory_list_screen.dart';
import '../../modules/inventory/products/screens/product_lookup_screen.dart';
import '../../modules/inventory/stock_movements/screens/stock_adjustment_screen.dart';
import '../../modules/inventory/stock_movements/screens/damage_report_screen.dart';
import '../../modules/inventory/batches/screens/receive_batch_screen.dart';
import '../../modules/inventory/transfers/screens/create_transfer_screen.dart';
import '../../modules/inventory/transfers/screens/transfer_list_screen.dart';
import '../../modules/inventory/scanner/screens/barcode_scanner_screen.dart';
import '../../modules/inventory/ai_insights/screens/ai_insights_screen.dart';
import '../../modules/procurement/screens/purchase_order_status_screen.dart';
import '../../modules/procurement/screens/replenishment_screen.dart';
import '../../modules/sales_demand/screens/demand_alerts_screen.dart';
import '../../modules/sales_demand/screens/record_pos_sale_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ValueNotifier<AuthState>(ref.watch(authStateProvider));

  ref.listen<AuthState>(authStateProvider, (_, next) {
    authNotifier.value = next;
  });

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);

      if (authState.isLoading) {
        return state.uri.path == '/splash' ? null : '/splash';
      }

      final isAuth = authState.isAuthenticated;
      final isLoggingIn = state.uri.path == '/login';

      if (!isAuth) {
        return isLoggingIn ? null : '/login';
      }

      // After login, land on the shell's Home tab (the role dashboard). Business Owners and Procurement
      // Managers work in the web app, as before.
      if (isLoggingIn || state.uri.path == '/splash') {
        final role = authState.user?.role ?? '';
        return role == 'BusinessOwner' || role == 'ProcurementManager'
            ? '/management-only'
            : '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/management-only',
        builder: (context, state) => const ManagementOnlyScreen(),
      ),
      // ── Shared bottom-nav shell ──────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const RoleHomeScreen(),
          ),
          GoRoute(
            path: '/inventory',
            builder: (context, state) => const InventoryListScreen(),
          ),
          GoRoute(
            path: '/product-lookup',
            builder: (context, state) => const ProductLookupScreen(),
          ),
          GoRoute(
            path: '/stock-adjustment',
            builder: (context, state) => const StockAdjustmentScreen(),
          ),
          GoRoute(
            path: '/damage-report',
            builder: (context, state) => const DamageReportScreen(),
          ),
          GoRoute(
            path: '/receive-batch',
            builder: (context, state) => const ReceiveBatchScreen(),
          ),
          GoRoute(
            path: '/transfers',
            builder: (context, state) => const TransferListScreen(),
          ),
          GoRoute(
            path: '/transfers/create',
            builder: (context, state) => const CreateTransferScreen(),
          ),
          GoRoute(
            path: '/scanner',
            builder: (context, state) => const BarcodeScannerScreen(),
          ),
          GoRoute(
            path: '/ai-insights',
            builder: (context, state) => const AiInsightsScreen(),
          ),
          GoRoute(
            path: '/sales/pos',
            builder: (context, state) => const RecordPosSaleScreen(),
          ),
          GoRoute(
            path: '/sales/demand-alerts',
            builder: (context, state) => const DemandAlertsScreen(),
          ),
          GoRoute(
            path: '/procurement/orders',
            builder: (context, state) => const PurchaseOrderStatusScreen(),
          ),
          GoRoute(
            path: '/replenishment',
            builder: (context, state) => const ReplenishmentScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/change-password',
            builder: (context, state) => const ChangePasswordScreen(),
          ),
        ],
      ),
    ],
  );
});
