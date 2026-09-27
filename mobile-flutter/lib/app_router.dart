import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/splash_screen.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/branch_manager_dashboard.dart';
import 'features/dashboard/screens/store_employee_dashboard.dart';
import 'features/dashboard/screens/management_only_screen.dart';
import 'features/profile/screens/profile_screen.dart';
import 'features/profile/screens/change_password_screen.dart';
import 'features/inventory/screens/inventory_list_screen.dart';
import 'features/products/screens/product_lookup_screen.dart';
import 'features/stock_movements/screens/stock_adjustment_screen.dart';
import 'features/stock_movements/screens/damage_report_screen.dart';
import 'features/batches/screens/receive_batch_screen.dart';
import 'features/transfers/screens/create_transfer_screen.dart';
import 'features/transfers/screens/transfer_list_screen.dart';
import 'features/scanner/screens/barcode_scanner_screen.dart';
import 'features/ai_insights/screens/ai_insights_screen.dart';

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

      if (isLoggingIn || state.uri.path == '/splash') {
        final role = authState.user?.role ?? '';
        if (role == 'BranchManager' ||
            role == 'WarehouseManager' ||
            role == 'SystemAdmin') {
          return '/manager-dashboard';
        } else if (role == 'StoreEmployee') {
          return '/employee-dashboard';
        } else {
          return '/management-only';
        }
      }

      if (state.uri.path == '/manager-dashboard') {
        final role = authState.user?.role ?? '';
        if (role == 'StoreEmployee') {
          ref.read(authStateProvider.notifier).setPermissionError(
              'Manager dashboard requires BranchManager role.');
          return '/employee-dashboard';
        }
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
        path: '/manager-dashboard',
        builder: (context, state) => const BranchManagerDashboard(),
      ),
      GoRoute(
        path: '/employee-dashboard',
        builder: (context, state) => const StoreEmployeeDashboard(),
      ),
      GoRoute(
        path: '/management-only',
        builder: (context, state) => const ManagementOnlyScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordScreen(),
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
    ],
  );
});
