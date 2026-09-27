import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';

class AiInsightsScreen extends ConsumerStatefulWidget {
  const AiInsightsScreen({super.key});

  @override
  ConsumerState<AiInsightsScreen> createState() => _AiInsightsScreenState();
}

class _AiInsightsScreenState extends ConsumerState<AiInsightsScreen> {
  List<dynamic> _recommendations = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRecommendations();
  }

  Future<void> _fetchRecommendations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final authState = ref.read(authStateProvider);
      final branchId = authState.user?.branchId;

      final path = branchId != null && branchId.isNotEmpty
          ? '/api/inventoryoptimization/recommendations?branchId=$branchId'
          : '/api/inventoryoptimization/recommendations';

      final res = await apiClient.get(path);
      setState(() {
        _recommendations = res is List ? res : [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Demand & Inventory Insights'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRecommendations,
          ),
        ],
      ),
      body: _isLoading
          ? const LoadingView(message: 'Generating AI recommendations...')
          : _error != null
              ? ErrorStateView(message: _error!, onRetry: _fetchRecommendations)
              : _recommendations.isEmpty
                  ? const EmptyStateView(
                      title: 'No Active AI Alerts',
                      description:
                          'Stock levels across all branches are currently optimal.',
                      icon: Icons.check_circle_outline,
                    )
                  : ListView.builder(
                      itemCount: _recommendations.length,
                      padding: const EdgeInsets.all(12),
                      itemBuilder: (context, index) {
                        final r =
                            _recommendations[index] as Map<String, dynamic>;
                        final status = r['status']?.toString() ?? 'Pending';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.auto_awesome,
                                        color: Colors.purple.shade700,
                                        size: 20),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        r['title']?.toString() ??
                                            'AI Recommendation',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  r['reasoning']?.toString() ??
                                      r['description']?.toString() ??
                                      'Optimization suggestion',
                                  style: TextStyle(
                                      color: Colors.grey.shade800,
                                      fontSize: 13,
                                      height: 1.3),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                          color: Colors.purple.shade50,
                                          borderRadius:
                                              BorderRadius.circular(4)),
                                      child: Text('Status: $status',
                                          style: TextStyle(
                                              color: Colors.purple.shade900,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12)),
                                    ),
                                    Text('Controlled Approval',
                                        style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 12,
                                            fontStyle: FontStyle.italic)),
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
