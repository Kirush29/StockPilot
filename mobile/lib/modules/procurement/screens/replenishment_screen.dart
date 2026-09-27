import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../../shared/auth/providers/auth_provider.dart';
import '../models/replenishment_workflow.dart';
import '../services/procurement_api_service.dart';

/// Runs the multi-agent Replenishment Orchestrator from the mobile app: Inventory Optimization →
/// Demand Forecast → Supplier Evaluation → Procurement Coordinator, stopping for a human decision.
/// Approval happens in the web app (or the Procurement approvals flow); this screen shows the live status.
class ReplenishmentScreen extends ConsumerStatefulWidget {
  final ProcurementApiService? apiService;

  const ReplenishmentScreen({super.key, this.apiService});

  @override
  ConsumerState<ReplenishmentScreen> createState() => _ReplenishmentScreenState();
}

class _ReplenishmentScreenState extends ConsumerState<ReplenishmentScreen> {
  late final ProcurementApiService _api;

  List<Map<String, dynamic>> _branches = [];
  List<Map<String, dynamic>> _products = [];
  String? _branchId;
  String? _productId;
  bool _loadingCatalog = true;
  bool _running = false;
  String? _error;

  ReplenishmentResult? _result;
  ReplenishmentDetail? _detail;

  @override
  void initState() {
    super.initState();
    _api = widget.apiService ?? ProcurementApiService(ref.read(apiClientProvider));
    _branchId = ref.read(authStateProvider).user?.branchId;
    _loadCatalog();
  }

  /// Inventory endpoints wrap lists in { success, data }.
  static List<Map<String, dynamic>> _items(dynamic response) {
    final list = response is Map<String, dynamic> ? response['data'] : response;
    return list is List ? list.whereType<Map<String, dynamic>>().toList() : [];
  }

  Future<void> _loadCatalog() async {
    final client = ref.read(apiClientProvider);
    try {
      final results = await Future.wait([client.get('/api/branches'), client.get('/api/products')]);
      if (!mounted) return;
      setState(() {
        _branches = _items(results[0]);
        _products = _items(results[1]);
        if (_branchId != null && !_branches.any((b) => b['branchId'] == _branchId)) _branchId = null;
        _loadingCatalog = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load branches and products: $e';
        _loadingCatalog = false;
      });
    }
  }

  Future<void> _run() async {
    if (_branchId == null || _productId == null) {
      setState(() => _error = 'Choose a branch and a product.');
      return;
    }
    setState(() {
      _running = true;
      _error = null;
    });
    try {
      final result = await _api.startReplenishment(ReplenishmentRequest(branchId: _branchId!, productId: _productId!));
      final detail = await _api.getReplenishment(result.workflowId);
      if (!mounted) return;
      setState(() {
        _result = result;
        _detail = detail;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  Future<void> _refresh() async {
    final id = _result?.workflowId;
    if (id == null) return;
    try {
      final detail = await _api.getReplenishment(id);
      if (mounted) setState(() => _detail = detail);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Color _statusColor(String status) => switch (status) {
        'NoActionRequired' => Colors.green.shade700,
        'PendingApproval' || 'QuantityConflict' => Colors.amber.shade800,
        'TransferRecommended' => Colors.blue.shade700,
        _ => Colors.red.shade700,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Replenishment Agent')),
      body: _loadingCatalog
          ? const LoadingView(message: 'Loading branches and products...')
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    CustomBanner(message: _error!, onDismiss: () => setState(() => _error = null)),
                    const SizedBox(height: 12),
                  ],
                  DropdownButtonFormField<String>(
                    key: const Key('replenishment-branch'),
                    initialValue: _branchId,
                    decoration: const InputDecoration(labelText: 'Branch'),
                    items: _branches
                        .map((b) => DropdownMenuItem(value: b['branchId'] as String, child: Text(b['name']?.toString() ?? '')))
                        .toList(),
                    onChanged: _running ? null : (v) => setState(() => _branchId = v),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    key: const Key('replenishment-product'),
                    initialValue: _productId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Product'),
                    items: _products
                        .map((p) => DropdownMenuItem(
                              value: p['productId'] as String,
                              child: Text('${p['name']} (${p['sku']})', overflow: TextOverflow.ellipsis),
                            ))
                        .toList(),
                    onChanged: _running ? null : (v) => setState(() => _productId = v),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _running ? null : _run,
                    icon: _running
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.auto_awesome),
                    label: Text(_running ? 'Running agents...' : 'Run replenishment check'),
                  ),
                  if (_result != null) ...[
                    const SizedBox(height: 20),
                    _buildResult(_result!, _detail),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildResult(ReplenishmentResult result, ReplenishmentDetail? detail) {
    final live = detail?.liveProposalStatus;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(result.statusLabel,
                    key: const Key('replenishment-status'),
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _statusColor(result.status))),
                const SizedBox(height: 8),
                if (result.decision != null) Text('Decision: ${result.decision}'),
                if (result.orderQuantity != null) Text('Order quantity: ${result.orderQuantity}'),
                if (result.inventoryShortageQuantity != null) Text('Inventory shortage: ${result.inventoryShortageQuantity}'),
                if (live != null)
                  Text('Proposal status: $live', key: const Key('replenishment-proposal-status'),
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                if (result.nextAction != null) ...[
                  const SizedBox(height: 8),
                  Text(result.nextAction!, style: TextStyle(color: Colors.grey.shade700)),
                ],
                for (final e in result.errors) Text(e, style: TextStyle(color: Colors.red.shade700)),
                if (result.proposalId != null)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: _refresh,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Refresh status'),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (detail != null && detail.steps.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text('Agent steps', style: TextStyle(fontWeight: FontWeight.bold)),
          for (final step in detail.steps)
            ListTile(
              dense: true,
              leading: Icon(
                switch (step.status) {
                  'Completed' => Icons.check_circle,
                  'Failed' => Icons.error,
                  _ => Icons.radio_button_unchecked,
                },
                color: switch (step.status) {
                  'Completed' => Colors.green,
                  'Failed' => Colors.red,
                  _ => Colors.grey,
                },
              ),
              title: Text(step.action),
              subtitle: step.detail == null ? null : Text(step.detail!),
            ),
        ],
      ],
    );
  }
}
