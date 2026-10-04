import '../../../../core/api/api_envelope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/common_widgets.dart';
import '../../../../shared/auth/providers/auth_provider.dart';

class ReceiveBatchScreen extends ConsumerStatefulWidget {
  const ReceiveBatchScreen({super.key});

  @override
  ConsumerState<ReceiveBatchScreen> createState() => _ReceiveBatchScreenState();
}

class _ReceiveBatchScreenState extends ConsumerState<ReceiveBatchScreen> {
  final _formKey = GlobalKey<FormState>();
  final _batchNumberController = TextEditingController();
  final _quantityController = TextEditingController();
  final _costController = TextEditingController();
  final _supplierController = TextEditingController();

  List<dynamic> _products = [];
  bool _isLoadingProducts = true;
  String? _selectedProductId;
  final DateTime _expiryDate = DateTime.now().add(const Duration(days: 365));
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  Future<void> _fetchProducts() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final res = await apiClient.get('/api/products');
      setState(() {
        _products = unwrapList(res);
        _isLoadingProducts = false;
      });
    } catch (e) {
      setState(() => _isLoadingProducts = false);
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please check and fill all required fields correctly.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final authState = ref.read(authStateProvider);

      final payload = {
        'batchNumber': _batchNumberController.text.trim(),
        'productId': _selectedProductId,
        'branchId': authState.user?.branchId,
        'quantity': double.parse(_quantityController.text.trim()),
        'unitCost': double.tryParse(_costController.text.trim()) ?? 0.0,
        'expiryDate': _expiryDate.toIso8601String(),
        'receivedDate': DateTime.now().toUtc().toIso8601String(),
        // Inventory's CreateBatchDto has no supplier field; supplier comes from the purchase order (D14).
      };

      await apiClient.post('/api/batches', data: payload);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('New inventory batch received successfully!'),
            backgroundColor: Colors.green),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to receive batch. Please verify batch data and connection.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Receive Stock Batch'),
      ),
      body: _isLoadingProducts
          ? const LoadingView(message: 'Loading product catalog...')
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: _selectedProductId,
                      decoration:
                          const InputDecoration(labelText: 'Received Product'),
                      items: _products.map<DropdownMenuItem<String>>((p) {
                        return DropdownMenuItem<String>(
                          value: p['productId'].toString(),
                          child: Text('${p['name']} (${p['sku']})'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedProductId = v),
                      validator: (v) =>
                          v == null ? 'Please select a received product' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _batchNumberController,
                      decoration: const InputDecoration(
                          labelText: 'Batch / Lot Number'),
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Please enter batch or lot number'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Quantity Received'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Please enter quantity received';
                        final qty = double.tryParse(v.trim());
                        if (qty == null || qty <= 0) {
                          return 'Quantity must be a valid number greater than 0';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _costController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'Unit Purchase Cost (Rs.)'),
                      validator: (v) {
                        if (v != null && v.trim().isNotEmpty) {
                          final cost = double.tryParse(v.trim());
                          if (cost == null || cost < 0) {
                            return 'Enter a valid cost in Rs. (0 or greater)';
                          }
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _supplierController,
                      decoration: const InputDecoration(
                          labelText: 'Supplier Name / Invoice No.'),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _isSubmitting
                          ? const LoadingView(message: '')
                          : const Text('Receive Batch Into Stock'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
