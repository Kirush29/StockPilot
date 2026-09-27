import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';

class TransferListScreen extends ConsumerStatefulWidget {
  const TransferListScreen({super.key});

  @override
  ConsumerState<TransferListScreen> createState() => _TransferListScreenState();
}

class _TransferListScreenState extends ConsumerState<TransferListScreen> {
  List<dynamic> _transfers = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchTransfers();
  }

  Future<void> _fetchTransfers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final res = await apiClient.get('/api/transfers');
      setState(() {
        _transfers = res is List ? res : [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _shipTransfer(String id) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.post('/api/transfers/$id/ship');
      _fetchTransfers();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  void _receiveTransfer(String id) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.post('/api/transfers/$id/receive');
      _fetchTransfers();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final userBranchId = authState.user?.branchId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inter-Branch Transfers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTransfers,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/transfers/create'),
        label: const Text('New Transfer'),
        icon: const Icon(Icons.add),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const LoadingView(message: 'Fetching transfer requests...')
          : _errorMessage != null
              ? ErrorStateView(
                  message: _errorMessage!, onRetry: _fetchTransfers)
              : _transfers.isEmpty
                  ? const EmptyStateView(
                      title: 'No transfers found',
                      description:
                          'Tap + New Transfer to initiate an inter-branch transfer.')
                  : ListView.builder(
                      itemCount: _transfers.length,
                      padding: const EdgeInsets.all(12),
                      itemBuilder: (context, index) {
                        final t = _transfers[index] as Map<String, dynamic>;
                        final id = t['id']?.toString() ?? '';
                        final status = t['status']?.toString() ?? 'Requested';
                        final sourceBranchId = t['sourceBranchId']?.toString();
                        final destBranchId =
                            t['destinationBranchId']?.toString();
                        final items = t['items'] as List<dynamic>?;
                        final firstItem = items != null && items.isNotEmpty
                            ? items.first as Map<String, dynamic>
                            : null;

                        Color statusColor = Colors.orange;
                        if (status == 'Approved') statusColor = Colors.blue;
                        if (status == 'InTransit' || status == 'Shipped') {
                          statusColor = Colors.purple;
                        }
                        if (status == 'Received') statusColor = Colors.green;
                        if (status == 'Rejected') statusColor = Colors.red;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      t['transferNumber']?.toString() ?? 'TRF',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                          color: statusColor.withValues(
                                              alpha: 0.15),
                                          borderRadius:
                                              BorderRadius.circular(4)),
                                      child: Text(status,
                                          style: TextStyle(
                                              color: statusColor,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                    'From: ${t['sourceBranchName'] ?? 'Unknown'} -> To: ${t['destinationBranchName'] ?? 'Unknown'}'),
                                if (firstItem != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                      'Item: ${firstItem['productName']} (Requested: ${firstItem['requestedQuantity']})',
                                      style: TextStyle(
                                          color: Colors.grey.shade700,
                                          fontSize: 13)),
                                ],
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    if (status == 'Approved' &&
                                        (userBranchId == null ||
                                            userBranchId == sourceBranchId))
                                      ElevatedButton.icon(
                                        onPressed: () => _shipTransfer(id),
                                        icon: const Icon(Icons.local_shipping,
                                            size: 16),
                                        label: const Text('Dispatch / Ship'),
                                        style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                Colors.purple.shade700,
                                            foregroundColor: Colors.white),
                                      ),
                                    if ((status == 'InTransit' ||
                                            status == 'Shipped') &&
                                        (userBranchId == null ||
                                            userBranchId == destBranchId))
                                      ElevatedButton.icon(
                                        onPressed: () => _receiveTransfer(id),
                                        icon: const Icon(
                                            Icons.check_circle_outline,
                                            size: 16),
                                        label: const Text('Receive Stock'),
                                        style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                Colors.green.shade700,
                                            foregroundColor: Colors.white),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
