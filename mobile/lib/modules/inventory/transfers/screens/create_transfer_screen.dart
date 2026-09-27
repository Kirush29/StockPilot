import '../../../../core/api/api_envelope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/common_widgets.dart';
import '../../../../shared/auth/providers/auth_provider.dart';

class CreateTransferScreen extends ConsumerStatefulWidget {
  const CreateTransferScreen({super.key});

  @override
  ConsumerState<CreateTransferScreen> createState() =>
      _CreateTransferScreenState();
}

class _CreateTransferScreenState extends ConsumerState<CreateTransferScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();

  List<dynamic> _branches = [];
  List<dynamic> _products = [];
  bool _isLoadingData = true;

  String? _sourceBranchId;
  String? _destinationBranchId;
  String? _selectedProductId;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadFormData();
  }

  Future<void> _loadFormData() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final bRes = await apiClient.get('/api/branches');
      final pRes = await apiClient.get('/api/products');

      setState(() {
        _branches = unwrapList(bRes);
        _products = unwrapList(pRes);
        _isLoadingData = false;
      });
    } catch (e) {
      setState(() => _isLoadingData = false);
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_sourceBranchId == _destinationBranchId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Source and Destination branches must be different.'),
            backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final payload = {
        'sourceBranchId': _sourceBranchId,
        'destinationBranchId': _destinationBranchId,
        'notes': _notesController.text.trim(),
        'items': [
          {
            'productId': _selectedProductId,
            'requestedQuantity': double.parse(_quantityController.text),
          }
        ],
      };

      await apiClient.post('/api/transfers', data: payload);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Stock transfer request submitted!'),
            backgroundColor: Colors.green),
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
        title: const Text('Create Stock Transfer'),
      ),
      body: _isLoadingData
          ? const LoadingView(message: 'Loading branches & products...')
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: _sourceBranchId,
                      decoration: const InputDecoration(
                          labelText: 'Source Branch (From)'),
                      items: _branches.map<DropdownMenuItem<String>>((b) {
                        return DropdownMenuItem<String>(
                          value: b['branchId'].toString(),
                          child: Text(b['name'].toString()),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _sourceBranchId = v),
                      validator: (v) =>
                          v == null ? 'Select source branch' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _destinationBranchId,
                      decoration: const InputDecoration(
                          labelText: 'Destination Branch (To)'),
                      items: _branches.map<DropdownMenuItem<String>>((b) {
                        return DropdownMenuItem<String>(
                          value: b['branchId'].toString(),
                          child: Text(b['name'].toString()),
                        );
                      }).toList(),
                      onChanged: (v) =>
                          setState(() => _destinationBranchId = v),
                      validator: (v) =>
                          v == null ? 'Select destination branch' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedProductId,
                      decoration: const InputDecoration(
                          labelText: 'Product to Transfer'),
                      items: _products.map<DropdownMenuItem<String>>((p) {
                        return DropdownMenuItem<String>(
                          value: p['productId'].toString(),
                          child: Text('${p['name']} (${p['sku']})'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedProductId = v),
                      validator: (v) => v == null ? 'Select product' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration:
                          const InputDecoration(labelText: 'Transfer Quantity'),
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
                      controller: _notesController,
                      decoration: const InputDecoration(
                          labelText: 'Transfer Notes / Dispatch Instructions'),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _isSubmitting
                          ? const LoadingView(message: '')
                          : const Text('Submit Transfer Request'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
