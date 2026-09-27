import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/providers/auth_provider.dart';
import 'dashboard/screens/branch_manager_dashboard.dart';
import 'dashboard/screens/store_employee_dashboard.dart';

/// One app shell for all modules: a persistent bottom navigation bar around every signed-in screen.
///
/// Tabs: Home (the role's dashboard — the tile hub that links every module screen), Inventory, Sales,
/// Orders and Profile. Store Employees keep Orders because they record purchase-order receipts
/// (Procurement's ViewOrders role). Screens opened from Home highlight the tab of the module they belong to.
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const tabs = [
    _Tab(label: 'Home', icon: Icons.dashboard_outlined, route: '/home', prefixes: ['/home']),
    _Tab(
      label: 'Inventory',
      icon: Icons.inventory_2_outlined,
      route: '/inventory',
      prefixes: ['/inventory', '/product-lookup', '/stock-adjustment', '/damage-report', '/receive-batch',
          '/transfers', '/scanner', '/ai-insights'],
    ),
    _Tab(label: 'Sales', icon: Icons.point_of_sale, route: '/sales/pos', prefixes: ['/sales']),
    _Tab(
      label: 'Orders',
      icon: Icons.local_shipping_outlined,
      route: '/procurement/orders',
      prefixes: ['/procurement', '/replenishment'],
    ),
    _Tab(label: 'Profile', icon: Icons.person_outline, route: '/profile', prefixes: ['/profile', '/change-password']),
  ];

  static int indexFor(String location) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].prefixes.any((p) => location == p || location.startsWith('$p/'))) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: indexFor(location),
        onDestinationSelected: (i) => context.go(tabs[i].route),
        destinations: [
          for (final tab in tabs) NavigationDestination(icon: Icon(tab.icon), label: tab.label),
        ],
      ),
    );
  }
}

/// The Home tab: the signed-in role's dashboard (Inventory module's role dashboards).
class RoleHomeScreen extends ConsumerWidget {
  const RoleHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authStateProvider).user?.role ?? '';
    return role == 'StoreEmployee' ? const StoreEmployeeDashboard() : const BranchManagerDashboard();
  }
}

class _Tab {
  final String label;
  final IconData icon;
  final String route;
  final List<String> prefixes;
  const _Tab({required this.label, required this.icon, required this.route, required this.prefixes});
}
