import '../../../../core/api/api_envelope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/common_widgets.dart';
import '../../../../shared/auth/providers/auth_provider.dart';

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
          content: Text('Please correct the validation errors in the damage report.'),
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
        'productId': _selectedProductId,
        'branchId': authState.user?.branchId,
        'quantity': double.parse(_quantityController.text),
        'movementType': 4, // MovementType.WriteOff — Inventory's adjustment for damaged/expired stock
        'reason': 'DAMAGED/EXPIRED: ${_reasonController.text.trim()}',
      };

      await apiClient.post('/api/stock-movements/adjustment', data: payload);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Damage report logged successfully!'),
            backgroundColor: Colors.green),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to submit damage report: ${e.toString().replaceAll("Exception:", "").trim()}'),
          backgroundColor: Colors.red,
        ),
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
                          value: p['productId'].toString(),
                          child: Text('${p['name']} (${p['sku']})'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedProductId = v),
                      validator: (v) =>
                          v == null ? 'Please select the damaged or expired product' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Damaged Quantity'),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Please enter damaged quantity';
                        final parsed = double.tryParse(v);
                        if (parsed == null || parsed <= 0) {
                          return 'Please enter a valid quantity greater than 0';
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
                          ? 'Please describe the cause of damage or expiry reason'
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
