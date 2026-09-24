import 'package:flutter/material.dart';

import 'procurement/screens/purchase_order_status_screen.dart';
import 'procurement/services/proposal_decision_watcher.dart';
import 'sales/screens/demand_alerts_screen.dart';
import 'sales/screens/record_pos_sale_screen.dart';
import 'shared/screens/login_screen.dart';
import 'shared/services/auth_service.dart';
import 'shared/services/procurement_notification_service.dart';

void main() {
  runApp(const StockPilotMobileApp());
}

class StockPilotMobileApp extends StatelessWidget {
  const StockPilotMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockPilot Operational',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        primaryColor: const Color(0xFF6366F1),
        scaffoldBackgroundColor: const Color(0xFF020617),
      ),
      home: const _SessionGate(),
    );
  }
}

/// Roles allowed to raise procurement proposals — the only ones that can be notified
/// when one they raised gets decided. Mirrors ProcurementRoles.RaiseOrView on the backend.
const _proposalRaiserRoles = ['BranchManager', 'ProcurementManager', 'BusinessOwner'];

/// Shows the login screen until a session is restored, then the dashboard. Also owns
/// starting/stopping the proposal decision watcher based on the signed-in user's role.
class _SessionGate extends StatefulWidget {
  const _SessionGate();

  @override
  State<_SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<_SessionGate> {
  @override
  void initState() {
    super.initState();
    ProcurementNotificationService.instance.init();
    AuthService.instance.restoreSession();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AuthService.instance,
      builder: (context, _) {
        final auth = AuthService.instance;

        if (!auth.isRestored) {
          return const Scaffold(
            backgroundColor: Color(0xFF020617),
            body: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
          );
        }

        if (!auth.isAuthenticated) {
          ProposalDecisionWatcher.instance.stop();
          return const LoginScreen();
        }

        if (_proposalRaiserRoles.contains(auth.user!.role)) {
          ProposalDecisionWatcher.instance.start();
        } else {
          ProposalDecisionWatcher.instance.stop();
        }

        return const MobileDashboardScreen();
      },
    );
  }
}

class MobileDashboardScreen extends StatefulWidget {
  const MobileDashboardScreen({super.key});

  @override
  State<MobileDashboardScreen> createState() => _MobileDashboardScreenState();
}

class _MobileDashboardScreenState extends State<MobileDashboardScreen> {
  int _currentIndex = 0;

  // Mirrors ProcurementRoles.ViewOrders on the backend.
  static const _viewOrdersRoles = ['StoreEmployee', 'BranchManager', 'ProcurementManager', 'BusinessOwner'];

  @override
  Widget build(BuildContext context) {
    final role = AuthService.instance.user?.role;
    final canViewOrders = role != null && _viewOrdersRoles.contains(role);

    final screens = <Widget>[
      const RecordPosSaleScreen(),
      const DemandAlertsScreen(),
      if (canViewOrders) const PurchaseOrderStatusScreen(),
    ];
    final items = <BottomNavigationBarItem>[
      const BottomNavigationBarItem(icon: Icon(Icons.point_of_sale), label: 'POS Sale'),
      const BottomNavigationBarItem(icon: Icon(Icons.trending_up), label: 'Demand Alerts'),
      if (canViewOrders) const BottomNavigationBarItem(icon: Icon(Icons.local_shipping), label: 'Orders'),
    ];
    final safeIndex = _currentIndex < screens.length ? _currentIndex : 0;

    return Scaffold(
      body: screens[safeIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: safeIndex,
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFF818CF8),
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() => _currentIndex = index),
        items: items,
      ),
    );
  }
}
