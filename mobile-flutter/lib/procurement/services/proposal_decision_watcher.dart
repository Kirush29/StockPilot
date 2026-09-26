import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../shared/services/auth_service.dart';
import '../../shared/services/procurement_notification_service.dart';
import '../models/proposal_summary.dart';

/// Polls the signed-in user's own proposals and fires a local notification the first time
/// one they raised flips to Approved/Rejected. This is the "push/local notification stub"
/// from the spec: it only works while the app is running and polling, not real server push
/// (no FCM/APNs wiring here, and it won't fire while the app is killed). Swap the call in
/// ProcurementNotificationService for real push once that infrastructure is decided.
class ProposalDecisionWatcher {
  ProposalDecisionWatcher._();
  static final ProposalDecisionWatcher instance = ProposalDecisionWatcher._();

  static const String baseUrl = 'http://10.0.2.2:5004';
  static const _pollInterval = Duration(seconds: 45);

  Timer? _timer;
  final Map<String, ProposalStatus> _lastKnownStatus = {};
  bool _primed = false;

  void start() {
    stop();
    _timer = Timer.periodic(_pollInterval, (_) => _poll());
    _poll();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _lastKnownStatus.clear();
    _primed = false;
  }

  Future<void> _poll() async {
    final user = AuthService.instance.user;
    if (user == null) return;

    try {
      final uri = Uri.parse('$baseUrl/api/procurement/proposals').replace(queryParameters: {
        'pageSize': '50',
        'sort': '-updatedAt',
      });
      final response = await http.get(uri, headers: {
        'Content-Type': 'application/json',
        ...AuthService.instance.authHeaders,
      });
      if (response.statusCode != 200) return;

      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final mine = (body['items'] as List<dynamic>? ?? [])
          .map((i) => ProposalSummary.fromJson(i as Map<String, dynamic>))
          .where((p) => p.createdByUserId == user.userId);

      for (final proposal in mine) {
        final previous = _lastKnownStatus[proposal.id];
        _lastKnownStatus[proposal.id] = proposal.status;

        // Skip the first poll after start() so we don't re-notify for decisions made
        // before this session began — only notify on a change observed while watching.
        if (!_primed || previous == null || previous == proposal.status) continue;

        if (proposal.status == ProposalStatus.approved) {
          await ProcurementNotificationService.instance
              .notifyProposalDecision(proposalLabel: _label(proposal), approved: true);
        } else if (proposal.status == ProposalStatus.rejected) {
          await ProcurementNotificationService.instance
              .notifyProposalDecision(proposalLabel: _label(proposal), approved: false);
        }
      }
      _primed = true;
    } catch (_) {
      // Silently retried on the next tick — this is a background watcher, not a user action.
    }
  }

  String _label(ProposalSummary proposal) => 'Proposal ${proposal.id.substring(0, 8)}';
}
