import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Shared barcode scanning for every module (integration). One camera implementation — the Inventory
/// module's (Student 1) mobile_scanner code, moved here unchanged — and one scan-input field — the
/// Procurement module's (Student 4) ScanInputField, which was written to take this camera widget.

/// Live camera preview with the scan frame. Calls [onCode] with each non-empty barcode value it detects
/// (the Inventory scanner's detection logic). Pass a [controller] to drive torch/camera from outside.
class BarcodeScannerView extends StatelessWidget {
  final MobileScannerController controller;
  final ValueChanged<String> onCode;

  const BarcodeScannerView({super.key, required this.controller, required this.onCode});

  void _onDetect(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? rawCode = barcodes.first.rawValue;
    if (rawCode == null || rawCode.trim().isEmpty) return;

    onCode(rawCode);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(
          controller: controller,
          onDetect: _onDetect,
        ),
        Center(
          child: Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).colorScheme.primary, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ],
    );
  }
}

/// Torch and camera-switch buttons for an AppBar (the Inventory scanner's actions).
List<Widget> barcodeScannerActions(MobileScannerController controller) => [
      IconButton(
        icon: ValueListenableBuilder(
          valueListenable: controller,
          builder: (context, state, child) {
            switch (state.torchState) {
              case TorchState.off:
                return const Icon(Icons.flash_off, color: Colors.grey);
              case TorchState.on:
                return const Icon(Icons.flash_on, color: Colors.amber);
              default:
                return const Icon(Icons.flash_off, color: Colors.grey);
            }
          },
        ),
        onPressed: () => controller.toggleTorch(),
      ),
      IconButton(
        icon: const Icon(Icons.cameraswitch),
        onPressed: () => controller.switchCamera(),
      ),
    ];

/// Opens the camera full screen and returns the first barcode scanned, or null if the user backs out.
Future<String?> scanBarcode(BuildContext context, {String title = 'Scan Barcode'}) =>
    Navigator.of(context).push<String>(
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => _ScanOnceScreen(title: title)),
    );

class _ScanOnceScreen extends StatefulWidget {
  final String title;
  const _ScanOnceScreen({required this.title});

  @override
  State<_ScanOnceScreen> createState() => _ScanOnceScreenState();
}

class _ScanOnceScreenState extends State<_ScanOnceScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _done = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onCode(String code) {
    if (_done) return;
    _done = true;
    Navigator.of(context).pop(code.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title), actions: barcodeScannerActions(_controller)),
      body: BarcodeScannerView(controller: _controller, onCode: _onCode),
    );
  }
}

/// Scan-or-type input (the Procurement module's ScanInputField): accepts a keyboard-wedge barcode scanner
/// (retail hardware that types the code followed by Enter), manual entry, or — through the camera button —
/// the shared camera scanner. [onScan] receives each code; the field clears after each one.
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

  Future<void> _scanWithCamera() async {
    final code = await scanBarcode(context, title: widget.label);
    if (code != null && code.isNotEmpty) widget.onScan(code);
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
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: widget.label,
              hintText: 'Scan or type a product code',
              prefixIcon: const Icon(Icons.qr_code_scanner),
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton(
          icon: const Icon(Icons.add_circle),
          color: Theme.of(context).colorScheme.primary,
          onPressed: _submit,
          tooltip: 'Add scanned item',
        ),
        IconButton.filled(
          icon: const Icon(Icons.photo_camera_outlined),
          onPressed: _scanWithCamera,
          tooltip: 'Scan with camera',
        ),
      ],
    );
  }
}
