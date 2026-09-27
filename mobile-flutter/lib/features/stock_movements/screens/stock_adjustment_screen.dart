import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';

class StockAdjustmentScreen extends ConsumerStatefulWidget {
  const StockAdjustmentScreen({super.key});

  @override
  ConsumerState<StockAdjustmentScreen> createState() =>
      _StockAdjustmentScreenState();
}

class _StockAdjustmentScreenState extends ConsumerState<StockAdjustmentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();

  List<dynamic> _products = [];
  List<dynamic> _branches = [];
  bool _isLoadingDropdowns = true;

  String? _selectedProductId;
  String? _selectedBranchId;
  int _movementType = 1; // 1 = StockAdjustment
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadDropdownData();
  }

  Future<void> _loadDropdownData() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final pRes = await apiClient.get('/api/products');
      final bRes = await apiClient.get('/api/branches');

      setState(() {
        _products = pRes is List ? pRes : [];
        _branches = bRes is List ? bRes : [];
        _isLoadingDropdowns = false;
      });
    } catch (e) {
      setState(() => _isLoadingDropdowns = false);
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final apiClient = ref.read(apiClientProvider);
      final payload = {
        'productId': _selectedProductId,
        'branchId': _selectedBranchId,
        'quantity': double.parse(_quantityController.text),
        'movementType': _movementType,
        'notes': _notesController.text,
      };

      await apiClient.post('/api/stockmovements', data: payload);

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Stock adjustment logged successfully!'),
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
        title: const Text('Stock Count Adjustment'),
      ),
      body: _isLoadingDropdowns
          ? const LoadingView(message: 'Loading products & branches...')
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      initialValue: _selectedProductId,
                      decoration: const InputDecoration(labelText: 'Product'),
                      items: _products.map<DropdownMenuItem<String>>((p) {
                        return DropdownMenuItem<String>(
                          value: p['id'].toString(),
                          child: Text('${p['name']} (${p['sku']})'),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedProductId = v),
                      validator: (v) => v == null ? 'Select product' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedBranchId,
                      decoration: const InputDecoration(labelText: 'Branch'),
                      items: _branches.map<DropdownMenuItem<String>>((b) {
                        return DropdownMenuItem<String>(
                          value: b['branchId'].toString(),
                          child: Text(b['name'].toString()),
                        );
                      }).toList(),
                      onChanged: (v) => setState(() => _selectedBranchId = v),
                      validator: (v) => v == null ? 'Select branch' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<int>(
                      initialValue: _movementType,
                      decoration:
                          const InputDecoration(labelText: 'Adjustment Type'),
                      items: const [
                        DropdownMenuItem(
                            value: 1,
                            child: Text(
                                'Stock Adjustment (Decrease / Correction)')),
                        DropdownMenuItem(
                            value: 4,
                            child: Text('Initial / Restock (Increase)')),
                      ],
                      onChanged: (v) => setState(() => _movementType = v ?? 1),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
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
                          labelText: 'Audit Notes / Reason'),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.purple.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _isSubmitting
                          ? const LoadingView(message: '')
                          : const Text('Submit Adjustment'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
