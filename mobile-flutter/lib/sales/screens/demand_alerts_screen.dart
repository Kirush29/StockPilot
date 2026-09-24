import 'package:flutter/material.dart';
import '../models/demand_summary.dart';
import '../services/sales_api_service.dart';

class DemandAlertsScreen extends StatefulWidget {
  const DemandAlertsScreen({super.key});

  @override
  State<DemandAlertsScreen> createState() => _DemandAlertsScreenState();
}

class _DemandAlertsScreenState extends State<DemandAlertsScreen> {
  final _apiService = SalesApiService();
  late Future<List<ReorderAlertItem>> _alertsFuture;

  @override
  void initState() {
    super.initState();
    _alertsFuture = _apiService.getReorderAlerts();
  }

  void _refresh() {
    setState(() {
      _alertsFuture = _apiService.getReorderAlerts();
    });
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency) {
      case 'Critical':
        return Colors.redAccent;
      case 'Warning':
        return Colors.amberAccent;
      default:
        return Colors.greenAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Demand & ROP Alerts'),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: Container(
        color: const Color(0xFF020617),
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<List<ReorderAlertItem>>(
          future: _alertsFuture,
          builder: (ctx, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
            }

            if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 54, color: Colors.teal),
                    const SizedBox(height: 12),
                    const Text('No Breached Reorder Points', style: TextStyle(color: Colors.white, fontSize: 16)),
                    const SizedBox(height: 6),
                    const Text('All stock velocity and levels are within safe buffers.', style: TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                      onPressed: _refresh,
                      child: const Text('Re-check Status', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            }

            final items = snapshot.data!;

            return ListView.builder(
              itemCount: items.length,
              itemBuilder: (ctx, idx) {
                final item = items[idx];
                final color = _getUrgencyColor(item.urgencyLevel);

                return Card(
                  color: const Color(0xFF1E293B),
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    side: BorderSide(color: color.withOpacity(0.4), width: 1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            Expanded(
                              child: Text(
                                item.productName,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '${item.urgencyLevel} (${item.daysOfSupplyRemaining}d left)',
                                style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(item.productSku, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        const Divider(color: Colors.white12, height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Stock: ${item.currentStock.toInt()} units', style: TextStyle(color: item.currentStock <= item.reorderPoint ? Colors.redAccent : Colors.white)),
                            Text('Daily Velocity: ${item.averageDailySales.toStringAsFixed(1)}/d', style: const TextStyle(color: Colors.white70)),
                            Text('ROP: ${item.reorderPoint.toInt()}', style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
