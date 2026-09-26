import 'package:flutter/material.dart';
import '../models/sale_transaction.dart';
import '../services/sales_api_service.dart';

class RecordPosSaleScreen extends StatefulWidget {
  const RecordPosSaleScreen({super.key});

  @override
  State<RecordPosSaleScreen> createState() => _RecordPosSaleScreenState();
}

class _RecordPosSaleScreenState extends State<RecordPosSaleScreen> {
  final _apiService = SalesApiService();
  final _customerController = TextEditingController();
  
  String _selectedBranch = 'Colombo Central Branch';
  int _paymentMethod = 1; // 1 = Cash, 2 = Card
  bool _isSubmitting = false;

  final List<SaleTransactionItem> _cartItems = [
    SaleTransactionItem(
      productId: '18464716-8fa7-49da-b521-08b1dc057c28',
      productSku: 'SKU-PARACETAMOL-500',
      productName: 'Paracetamol 500mg (100 Tabs)',
      category: 'Pharmaceuticals',
      quantity: 2,
      unitPrice: 24.50,
      discountPercent: 0,
    ),
  ];

  double get _subTotal => _cartItems.fold(0.0, (sum, i) => sum + (i.quantity * i.unitPrice));
  double get _tax => _subTotal * 0.08;
  double get _total => _subTotal + _tax;

  Future<void> _submitTransaction() async {
    if (_cartItems.isEmpty) return;

    setState(() => _isSubmitting = true);

    final payload = CreateSalePayload(
      branchName: _selectedBranch,
      paymentMethod: _paymentMethod,
      customerReference: _customerController.text.isEmpty ? 'Walk-in Customer' : _customerController.text,
      items: _cartItems,
    );

    final success = await _apiService.recordSale(payload);

    setState(() => _isSubmitting = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Sale recorded successfully!' : 'Failed to record sale. Check backend connection.'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
      if (success) {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Record POS Sale'),
        backgroundColor: const Color(0xFF0F172A),
      ),
      body: Container(
        color: const Color(0xFF020617),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              value: _selectedBranch,
              dropdownColor: const Color(0xFF1E293B),
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Branch Location',
                labelStyle: TextStyle(color: Colors.grey),
              ),
              items: const [
                DropdownMenuItem(value: 'Colombo Central Branch', child: Text('Colombo Central Branch')),
                DropdownMenuItem(value: 'Kandy City Branch', child: Text('Kandy City Branch')),
              ],
              onChanged: (val) => setState(() => _selectedBranch = val!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _customerController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Customer Reference (Optional)',
                labelStyle: TextStyle(color: Colors.grey),
              ),
            ),
            const SizedBox(height: 20),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Scanned Cart Items', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _cartItems.length,
                itemBuilder: (ctx, idx) {
                  final item = _cartItems[idx];
                  return Card(
                    color: const Color(0xFF1E293B),
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    child: ListTile(
                      title: Text(item.productName, style: const TextStyle(color: Colors.white)),
                      subtitle: Text('${item.quantity} × \$${item.unitPrice.toStringAsFixed(2)}', style: const TextStyle(color: Colors.grey)),
                      trailing: Text('\$${(item.quantity * item.unitPrice).toStringAsFixed(2)}', style: const TextStyle(color: Colors.tealAccent, fontWeight: FontWeight.bold)),
                    ),
                  );
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Subtotal:', style: TextStyle(color: Colors.grey)),
                    Text('\$${_subTotal.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white)),
                  ]),
                  const SizedBox(height: 4),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Tax (8%):', style: TextStyle(color: Colors.grey)),
                    Text('\$${_tax.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white)),
                  ]),
                  const Divider(color: Colors.white24),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Grand Total:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    Text('\$${_total.toStringAsFixed(2)}', style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 18)),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                onPressed: _isSubmitting ? null : _submitTransaction,
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Complete & Dispatch Sale', style: TextStyle(fontSize: 16, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
