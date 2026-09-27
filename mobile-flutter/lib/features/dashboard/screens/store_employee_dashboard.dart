import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';

class StoreEmployeeDashboard extends ConsumerWidget {
  const StoreEmployeeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Employee Operations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authStateProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authStateProvider.notifier).checkSession();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (authState.permissionError != null)
                CustomBanner(
                  message: authState.permissionError!,
                  onDismiss: () => ref
                      .read(authStateProvider.notifier)
                      .clearPermissionError(),
                ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: Colors.blue.shade100,
                        child: Text(
                          user?.fullName.isNotEmpty == true
                              ? user!.fullName[0].toUpperCase()
                              : 'E',
                          style: TextStyle(
                              color: Colors.blue.shade800,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.fullName ?? 'Store Employee',
                                style: const TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold)),
                            Text(user?.email ?? '',
                                style: TextStyle(
                                    color: Colors.grey.shade600, fontSize: 13)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(4)),
                              child: Text(
                                  'Role: ${user?.role ?? "StoreEmployee"}',
                                  style: TextStyle(
                                      color: Colors.blue.shade700,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text('Daily Operational Actions',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  _buildNavCard(
                    context,
                    title: 'Barcode Scanner',
                    icon: Icons.qr_code_scanner,
                    color: Colors.indigo,
                    route: '/scanner',
                  ),
                  _buildNavCard(
                    context,
                    title: 'Product Lookup',
                    icon: Icons.search,
                    color: Colors.teal,
                    route: '/product-lookup',
                  ),
                  _buildNavCard(
                    context,
                    title: 'Stock Adjustment',
                    icon: Icons.tune,
                    color: Colors.orange.shade800,
                    route: '/stock-adjustment',
                  ),
                  _buildNavCard(
                    context,
                    title: 'Report Damage',
                    icon: Icons.report_problem_outlined,
                    color: Colors.red.shade700,
                    route: '/damage-report',
                  ),
                  _buildNavCard(
                    context,
                    title: 'Receive Batch',
                    icon: Icons.move_to_inbox,
                    color: Colors.green.shade700,
                    route: '/receive-batch',
                  ),
                  _buildNavCard(
                    context,
                    title: 'View Transfers',
                    icon: Icons.swap_horiz,
                    color: Colors.blue,
                    route: '/transfers',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavCard(BuildContext context,
      {required String title,
      required IconData icon,
      required Color color,
      required String route}) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade200)),
      child: InkWell(
        onTap: () => context.push(route),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
