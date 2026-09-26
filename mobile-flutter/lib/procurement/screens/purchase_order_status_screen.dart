import 'package:flutter/material.dart';

import '../models/purchase_order.dart';
import '../services/procurement_api_service.dart';
import 'delivery_receiving_screen.dart';

/// Read-only "where's my order" tracking list. Orders are scoped by whatever the backend's
/// role-based authorization returns for the signed-in user (see OrdersController) — the API
/// does not currently expose branch on PurchaseOrder, so this cannot filter to "my branch"
/// client-side; it shows everything the caller's role is allowed to view.
class PurchaseOrderStatusScreen extends StatefulWidget {
  const PurchaseOrderStatusScreen({super.key});

  @override
  State<PurchaseOrderStatusScreen> createState() => _PurchaseOrderStatusScreenState();
}

class _PurchaseOrderStatusScreenState extends State<PurchaseOrderStatusScreen> {
  final _apiService = ProcurementApiService();

  bool _isLoading = true;
  List<PurchaseOrder> _orders = [];
  String? _errorMessage;
  PurchaseOrderStatus? _statusFilter;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final orders = await _apiService.getOrders(status: _statusFilter);
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e is ProcurementApiException ? e.message : 'Could not load purchase orders.';
        _isLoading = false;
      });
    }
  }

  Color _statusColor(PurchaseOrderStatus status) => switch (status) {
        PurchaseOrderStatus.ordered => Colors.blueAccent,
        PurchaseOrderStatus.partiallyReceived => Colors.amberAccent,
        PurchaseOrderStatus.received => Colors.greenAccent,
        PurchaseOrderStatus.cancelled => Colors.redAccent,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase Orders'),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      backgroundColor: const Color(0xFF020617),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SizedBox(
              width: double.infinity,
              child: DropdownButtonFormField<PurchaseOrderStatus?>(
                value: _statusFilter,
                dropdownColor: const Color(0xFF1E293B),
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Filter by status',
                  labelStyle: TextStyle(color: Colors.grey),
                ),
                items: <DropdownMenuItem<PurchaseOrderStatus?>>[
                  const DropdownMenuItem<PurchaseOrderStatus?>(value: null, child: Text('All statuses')),
                  ...PurchaseOrderStatus.values.map(
                    (s) => DropdownMenuItem<PurchaseOrderStatus?>(value: s, child: Text(s.label)),
                  ),
                ],
                onChanged: (value) {
                  setState(() => _statusFilter = value);
                  _load();
                },
              ),
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(_errorMessage!, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                onPressed: _load,
                child: const Text('Retry', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    if (_orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, size: 54, color: Colors.grey),
            const SizedBox(height: 12),
            const Text('No Purchase Orders', style: TextStyle(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 6),
            Text(
              _statusFilter == null ? 'Nothing has been ordered yet.' : 'No orders with this status.',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: const Color(0xFF6366F1),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _orders.length,
        itemBuilder: (ctx, idx) {
          final order = _orders[idx];
          final color = _statusColor(order.status);
          final canReceive = order.status == PurchaseOrderStatus.ordered || order.status == PurchaseOrderStatus.partiallyReceived;

          return Card(
            color: const Color(0xFF1E293B),
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              side: BorderSide(color: color.withOpacity(0.4)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.all(14),
              title: Text(order.orderNumber, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  '\$${order.totalCost.toStringAsFixed(2)} · ${order.expectedDeliveryDate != null ? 'Expected ${order.expectedDeliveryDate}' : 'No delivery date yet'}',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                    child: Text(order.status.label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  if (canReceive) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0)),
                      onPressed: () async {
                        final changed = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(builder: (_) => DeliveryReceivingScreen(order: order)),
                        );
                        if (changed == true) _load();
                      },
                      child: const Text('Receive', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
