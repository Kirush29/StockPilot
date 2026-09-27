import '../../../../core/api/api_envelope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/widgets/common_widgets.dart';
import '../../../../shared/auth/providers/auth_provider.dart';
import '../../../../shared/scanning/barcode_scanning.dart';

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;
  Map<String, dynamic>? _scannedProduct;
  String? _errorMessage;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // Integration: detection lives in the shared BarcodeScannerView, which passes each non-empty code here.
  void _onDetect(String rawCode) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final res =
          await apiClient.get('/api/products/barcode/${rawCode.trim()}');

      setState(() {
        _scannedProduct = unwrapObject(res);
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'No product catalog entry found for barcode: $rawCode';
        _scannedProduct = null;
        _isProcessing = false;
      });
    }
  }

  void _resetScanner() {
    setState(() {
      _scannedProduct = null;
      _errorMessage = null;
      _isProcessing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Barcode Scanner'),
        actions: barcodeScannerActions(_controller),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: BarcodeScannerView(controller: _controller, onCode: _onDetect),
          ),
          Expanded(
            flex: 2,
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  if (_isProcessing)
                    const LoadingView(message: 'Querying product database...'),
                  if (_errorMessage != null)
                    CustomBanner(message: _errorMessage!),
                  if (_scannedProduct != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    _scannedProduct!['name']?.toString() ??
                                        'Product',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                      color: Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(4)),
                                  child: Text(
                                    '\$${(_scannedProduct!['sellingPrice'] as num?)?.toStringAsFixed(2) ?? "0.00"}',
                                    style: TextStyle(
                                        color: Colors.green.shade900,
                                        fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                                'SKU: ${_scannedProduct!["sku"]} | Barcode: ${_scannedProduct!["barcode"]}'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: _resetScanner,
                      icon: const Icon(Icons.qr_code_scanner),
                      label: const Text('Scan Another Item'),
                    ),
                  ],
                  if (!_isProcessing &&
                      _scannedProduct == null &&
                      _errorMessage == null)
                    const Center(
                      child: Text(
                        'Align barcode inside camera frame',
                        style: TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
