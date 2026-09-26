import 'package:flutter/material.dart';

/// Seam for the camera-based barcode scanner the Inventory module owns — coordinate with
/// that teammate before this ships to production. Until the shared widget lands, this
/// accepts input from a keyboard-wedge barcode scanner (retail hardware that types the
/// code followed by Enter) or manual entry, so receiving still works without a camera.
/// Keep the [onScan] contract the same when swapping the body for the real widget.
class ScanInputField extends StatefulWidget {
  final String label;
  final ValueChanged<String> onScan;

  const ScanInputField({super.key, required this.label, required this.onScan});

  @override
  State<ScanInputField> createState() => _ScanInputFieldState();
}

class _ScanInputFieldState extends State<ScanInputField> {
  final _controller = TextEditingController();

  void _submit() {
    final code = _controller.text.trim();
    if (code.isEmpty) return;
    widget.onScan(code);
    _controller.clear();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            style: const TextStyle(color: Colors.white),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: widget.label,
              labelStyle: const TextStyle(color: Colors.grey),
              hintText: 'Scan or type a product code',
              hintStyle: const TextStyle(color: Colors.grey),
              prefixIcon: const Icon(Icons.qr_code_scanner, color: Colors.grey),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: const Icon(Icons.add_circle, color: Color(0xFF6366F1)),
          onPressed: _submit,
          tooltip: 'Add scanned item',
        ),
      ],
    );
  }
}
