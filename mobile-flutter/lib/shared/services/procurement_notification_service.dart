import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Local-notification stub for "a proposal I raised was Approved/Rejected". This only
/// fires while the app is running and something (ProposalDecisionWatcher) has polled and
/// noticed a change — it is not server push and won't wake the app from a killed state.
/// Swap the plugin call inside [notifyProposalDecision] for real push once FCM/APNs
/// infrastructure is decided; callers of this service don't need to change.
class ProcurementNotificationService {
  ProcurementNotificationService._();
  static final ProcurementNotificationService instance = ProcurementNotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );

    // Android 13+ requires this runtime request or notifications silently never show.
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);

    _initialized = true;
  }

  Future<void> notifyProposalDecision({required String proposalLabel, required bool approved}) async {
    if (!_initialized) await init();

    const androidDetails = AndroidNotificationDetails(
      'procurement_decisions',
      'Procurement Decisions',
      channelDescription: 'Notifies when a proposal you raised is approved or rejected.',
      importance: Importance.high,
      priority: Priority.high,
    );
    const details = NotificationDetails(android: androidDetails, iOS: DarwinNotificationDetails());

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      approved ? 'Proposal Approved' : 'Proposal Rejected',
      '$proposalLabel was ${approved ? 'approved' : 'rejected'}.',
      details,
    );
  }
}
