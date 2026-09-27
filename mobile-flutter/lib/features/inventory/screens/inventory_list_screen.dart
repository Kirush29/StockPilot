import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/inventory_item.dart';

class InventoryListScreen extends ConsumerStatefulWidget {
  const InventoryListScreen({super.key});

  @override
  ConsumerState<InventoryListScreen> createState() =>
      _InventoryListScreenState();
}

class _InventoryListScreenState extends ConsumerState<InventoryListScreen> {
  List<InventoryItem> _items = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchInventory();
  }

  Future<void> _fetchInventory() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final res = await apiClient.get('/api/inventory');
      if (res != null && res is List) {
        setState(() {
          _items = res.map((json) => InventoryItem.fromJson(json)).toList();
          _isLoading = false;
        });
      } else {
        setState(() {
          _items = [];
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _items.where((i) {
      final q = _searchQuery.toLowerCase();
      return i.productName.toLowerCase().contains(q) ||
          i.sku.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchInventory,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search product or SKU...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const LoadingView(message: 'Fetching inventory data...')
                : _errorMessage != null
                    ? ErrorStateView(
                        message: _errorMessage!, onRetry: _fetchInventory)
                    : filtered.isEmpty
                        ? const EmptyStateView(
                            title: 'No inventory items',
                            description:
                                'No items match your search or filter.')
                        : ListView.builder(
                            itemCount: filtered.length,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            itemBuilder: (context, index) {
                              final item = filtered[index];
                              final isLow =
                                  item.quantityOnHand <= item.reorderLevel;

                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(item.productName,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold)),
                                  subtitle: Text(
                                      'SKU: ${item.sku} | Branch: ${item.branchName}'),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${item.quantityOnHand.toInt()} units',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: isLow
                                              ? Colors.red
                                              : Colors.green.shade800,
                                        ),
                                      ),
                                      Text(
                                        isLow ? 'Low Stock' : 'In Stock',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: isLow
                                                ? Colors.red
                                                : Colors.grey.shade600),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
