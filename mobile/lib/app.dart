import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'shared/navigation/app_router.dart';
import 'shared/theme/app_theme.dart';
import 'shared/auth/providers/auth_provider.dart';
import 'modules/procurement/services/procurement_notification_service.dart';
import 'modules/procurement/services/proposal_decision_watcher.dart';

/// Roles allowed to raise procurement proposals — the only ones that can be notified when one
/// they raised gets decided. Mirrors ProcurementRoles.RaiseOrView on the backend.
const proposalRaiserRoles = ['BranchManager', 'ProcurementManager', 'BusinessOwner'];

class StockPilotApp extends ConsumerStatefulWidget {
  const StockPilotApp({super.key});

  @override
  ConsumerState<StockPilotApp> createState() => _StockPilotAppState();
}

class _StockPilotAppState extends ConsumerState<StockPilotApp> {
  @override
  void initState() {
    super.initState();
    // The local-notification plugin has no implementation in some environments (tests, desktop);
    // decisions then simply aren't announced.
    ProcurementNotificationService.instance.init().catchError((_) {});
  }

  /// Starts/stops the Procurement proposal decision watcher with the signed-in user's role
  /// (same behaviour as the Procurement module's original session gate).
  void _syncDecisionWatcher(AuthState auth) {
    final user = auth.user;
    if (auth.isAuthenticated && user != null && proposalRaiserRoles.contains(user.role)) {
      ProposalDecisionWatcher.instance.start(ref.read(apiClientProvider), user.userId);
    } else {
      ProposalDecisionWatcher.instance.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authStateProvider, (previous, next) {
      if (previous?.isAuthenticated != next.isAuthenticated || previous?.user?.userId != next.user?.userId) {
        _syncDecisionWatcher(next);
      }
    });
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'StockPilot Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
