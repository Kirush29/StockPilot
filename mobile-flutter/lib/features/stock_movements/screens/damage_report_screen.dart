import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';

class DamageReportScreen extends ConsumerStatefulWidget {
  const DamageReportScreen({super.key});

  @override
  ConsumerState<DamageReportScreen> createState() => _DamageReportScreenState();
}

class _DamageReportScreenState extends ConsumerState<DamageReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _reasonController = TextEditingController();

  List<dynamic> _products = [];
  bool _isLoadingProducts = true;
  String? _selectedProductId;
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
        _products = res is List ? res : [];
        _isLoadingProducts = false;
      });
    } catch (e) {
      setState(() => _isLoadingProducts = false);
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final authState = ref.read(authStateProvider);

      final payload = {
        'productId': _selectedProductId,
        'branchId': authState.user?.branchId,
        'quantity': double.parse(_quantityController.text),
        'movementType': 2, // 2 = Damage/Expired
        'notes': 'DAMAGED/EXPIRED: ${_reasonController.text}',
      };

      await apiClient.post('/api/stockmovements', data: payload);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Damage report logged successfully!'),
            backgroundColor: Colors.orange),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Damaged / Expired Item'),
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
                      decoration: const InputDecoration(
                          labelText: 'Damaged / Expired Product'),
                      items: _products.map<DropdownMenuItem<String>>((p) {
                        return DropdownMenuItem<String>(
                          value: p['id'].toString(),
                          child: Text('${p['name']} (${p['sku']})'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedProductId = v),
                      validator: (v) =>
                          v == null ? 'Select damaged product' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Damaged Quantity'),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Enter quantity';
                        if (double.tryParse(v) == null) {
                          return 'Enter valid number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _reasonController,
                      decoration: const InputDecoration(
                          labelText: 'Reason for Damage / Expiry Note'),
                      maxLines: 3,
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Describe damage cause'
                          : null,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _isSubmitting
                          ? const LoadingView(message: '')
                          : const Text('Submit Damage Report'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
