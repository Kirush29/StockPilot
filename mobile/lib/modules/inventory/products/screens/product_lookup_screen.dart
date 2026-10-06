import '../../../../core/api/api_envelope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/common_widgets.dart';
import '../../../../shared/auth/providers/auth_provider.dart';

class ProductLookupScreen extends ConsumerStatefulWidget {
  const ProductLookupScreen({super.key});

  @override
  ConsumerState<ProductLookupScreen> createState() =>
      _ProductLookupScreenState();
}

class _ProductLookupScreenState extends ConsumerState<ProductLookupScreen> {
  final _searchController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _product;
  String? _error;

  void _searchBarcode() async {
    final code = _searchController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
      _product = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final res = await apiClient.get('/api/products/barcode/$code');
      setState(() {
        _product = unwrapObject(res);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Product not found for barcode: $code';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Barcode Lookup'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Scan or Enter Barcode Number',
                      prefixIcon: Icon(Icons.qr_code),
                    ),
                    onSubmitted: (_) => _searchBarcode(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isLoading ? null : _searchBarcode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple.shade700,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        vertical: 16, horizontal: 16),
                  ),
                  child: const Text('Search'),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (_isLoading) const LoadingView(message: 'Searching catalog...'),
            if (_error != null) CustomBanner(message: _error!),
            if (_product != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _product!['name']?.toString() ?? 'Unnamed Product',
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text('SKU: ${_product!["sku"] ?? "N/A"}'),
                      Text('Barcode: ${_product!["barcode"] ?? "N/A"}'),
                      Text(
                          'Category: ${_product!["categoryName"] ?? "General"}'),
                      const SizedBox(height: 12),
                      Text(
                        'Selling Price: Rs. ${(_product!["price"] as num?)?.toStringAsFixed(2) ?? "0.00"}',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.purple.shade900),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
