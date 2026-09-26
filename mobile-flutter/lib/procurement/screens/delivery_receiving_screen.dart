import 'package:flutter/material.dart';

import '../../shared/widgets/scan_input_field.dart';
import '../models/purchase_order.dart';
import '../services/procurement_api_service.dart';

/// Lets a Store Employee confirm receipt (full or partial) of a PurchaseOrder that's
/// still Ordered or PartiallyReceived. Scanning (or typing) a product code checks it off
/// against this order's line items.
///
/// Known backend limitation: UpdateOrderStatusRequest only carries an overall Status +
/// free-text Notes (see backend/.../Dtos/Orders/UpdateOrderStatusRequest.cs) — there is no
/// per-line ReceivedQuantity field yet. So the per-item counts gathered here drive which
/// status we submit (PartiallyReceived vs Received) and get folded into the Notes text for
/// an audit trail, but they aren't queryable as structured data server-side. A follow-up
/// API change to add per-line received quantities would let this persist properly.
class DeliveryReceivingScreen extends StatefulWidget {
  final PurchaseOrder order;

  const DeliveryReceivingScreen({super.key, required this.order});

  @override
  State<DeliveryReceivingScreen> createState() => _DeliveryReceivingScreenState();
}

class _DeliveryReceivingScreenState extends State<DeliveryReceivingScreen> {
  final _apiService = ProcurementApiService();
  final _notesController = TextEditingController();

  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _errorMessage;
  PurchaseOrder? _detail;
  String? _scanFeedback;
  final Map<String, int> _receivedQuantities = {};

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final detail = await _apiService.getOrderById(widget.order.id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _receivedQuantities
          ..clear()
          ..addEntries(detail.lineItems.map((li) => MapEntry(li.productId, 0)));
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e is ProcurementApiException ? e.message : 'Could not load order details.';
        _isLoading = false;
      });
    }
  }

  void _handleScan(String code) {
    final detail = _detail;
    if (detail == null) return;

    final matches = detail.lineItems.where((li) => li.productId.toLowerCase() == code.trim().toLowerCase());
    if (matches.isEmpty) {
      setState(() => _scanFeedback = 'No line item on this order matches "$code".');
      return;
    }

    final line = matches.first;
    final current = _receivedQuantities[line.productId] ?? 0;
    if (current >= line.quantity) {
      setState(() => _scanFeedback = 'Already recorded all ${line.quantity} units for this item.');
      return;
    }

    setState(() {
      _receivedQuantities[line.productId] = current + 1;
      _scanFeedback = 'Recorded ${current + 1}/${line.quantity} for ${_shortId(line.productId)}.';
    });
  }

  void _adjustQuantity(PurchaseOrderLineItem line, int delta) {
    final current = _receivedQuantities[line.productId] ?? 0;
    final next = (current + delta).clamp(0, line.quantity).toInt();
    setState(() => _receivedQuantities[line.productId] = next);
  }

  void _markAllReceived() {
    final detail = _detail;
    if (detail == null) return;
    setState(() {
      for (final li in detail.lineItems) {
        _receivedQuantities[li.productId] = li.quantity;
      }
      _scanFeedback = null;
    });
  }

  bool get _isFullyReceived {
    final detail = _detail;
    if (detail == null || detail.lineItems.isEmpty) return false;
    return detail.lineItems.every((li) => (_receivedQuantities[li.productId] ?? 0) >= li.quantity);
  }

  bool get _hasAnyReceived => _receivedQuantities.values.any((q) => q > 0);

  Future<void> _confirmReceipt() async {
    final detail = _detail;
    if (detail == null || !_hasAnyReceived || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    final targetStatus = _isFullyReceived ? PurchaseOrderStatus.received : PurchaseOrderStatus.partiallyReceived;
    final perLineSummary = detail.lineItems
        .map((li) => '${_shortId(li.productId)}: ${_receivedQuantities[li.productId] ?? 0}/${li.quantity}')
        .join(', ');
    final notesParts = [
      'Received via mobile: $perLineSummary.',
      if (_notesController.text.trim().isNotEmpty) _notesController.text.trim(),
    ];

    try {
      await _apiService.updateOrderStatus(
        detail.id,
        UpdateOrderStatusPayload(status: targetStatus, notes: notesParts.join(' ')),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order marked as ${targetStatus.label}.'), backgroundColor: Colors.green),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      final message = e is ProcurementApiException ? e.message : 'Could not update the order.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _shortId(String id) => id.length > 8 ? id.substring(0, 8) : id;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Receive ${widget.order.orderNumber}'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFF020617),
      body: _buildBody(),
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
                onPressed: _loadDetail,
                child: const Text('Retry', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    final detail = _detail!;

    if (detail.lineItems.isEmpty) {
      return const Center(
        child: Text('This order has no line items to receive.', style: TextStyle(color: Colors.grey)),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: ScanInputField(label: 'Scan received item', onScan: _handleScan),
        ),
        if (_scanFeedback != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(_scanFeedback!, style: const TextStyle(color: Color(0xFF818CF8), fontSize: 12)),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _markAllReceived,
              child: const Text('Mark all as received', style: TextStyle(color: Colors.grey)),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            itemCount: detail.lineItems.length,
            itemBuilder: (ctx, idx) {
              final line = detail.lineItems[idx];
              final received = _receivedQuantities[line.productId] ?? 0;
              final complete = received >= line.quantity;

              return Card(
                color: const Color(0xFF1E293B),
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: complete ? Colors.greenAccent.withOpacity(0.5) : Colors.white12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Product ${_shortId(line.productId)}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          if (complete) const Icon(Icons.check_circle, color: Colors.greenAccent, size: 20),
                        ],
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: line.quantity == 0 ? 0.0 : received / line.quantity,
                        backgroundColor: Colors.white12,
                        color: complete ? Colors.greenAccent : const Color(0xFF6366F1),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('$received / ${line.quantity} received', style: const TextStyle(color: Colors.grey)),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Colors.grey),
                                onPressed: received > 0 ? () => _adjustQuantity(line, -1) : null,
                              ),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: Color(0xFF818CF8)),
                                onPressed: received < line.quantity ? () => _adjustQuantity(line, 1) : null,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            border: Border(top: BorderSide(color: Colors.white12)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _notesController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  labelStyle: TextStyle(color: Colors.grey),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                  onPressed: (_hasAnyReceived && !_isSubmitting) ? _confirmReceipt : null,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _isFullyReceived ? 'Confirm Full Receipt' : 'Confirm Partial Receipt',
                          style: const TextStyle(color: Colors.white, fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
