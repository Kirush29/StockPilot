class InventoryItem {
  final String id;
  final String productId;
  final String productName;
  final String sku;
  final String branchId;
  final String branchName;
  final double quantityOnHand;
  final double reorderLevel;
  final String unitOfMeasure;
  final String status;

  InventoryItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.sku,
    required this.branchId,
    required this.branchName,
    required this.quantityOnHand,
    required this.reorderLevel,
    required this.unitOfMeasure,
    required this.status,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) {
    return InventoryItem(
      id: json['inventoryId']?.toString() ?? json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ??
          json['name']?.toString() ??
          'Unknown Item',
      sku: json['sku']?.toString() ?? '',
      branchId: json['branchId']?.toString() ?? '',
      branchName: json['branchName']?.toString() ?? '',
      quantityOnHand: (json['quantityOnHand'] as num?)?.toDouble() ??
          (json['quantity'] as num?)?.toDouble() ??
          0.0,
      reorderLevel: (json['reorderLevel'] as num?)?.toDouble() ?? 0.0,
      unitOfMeasure: json['unitOfMeasure']?.toString() ?? 'Units',
      status: json['status']?.toString() ?? 'InStock',
    );
  }
}
