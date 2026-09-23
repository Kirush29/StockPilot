class ReorderAlertItem {
  final String productId;
  final String productSku;
  final String productName;
  final String branchName;
  final double currentStock;
  final double averageDailySales;
  final int leadTimeDays;
  final double safetyStock;
  final double reorderPoint;
  final double recommendedOrderQuantity;
  final bool needsReorder;
  final int daysOfSupplyRemaining;
  final String urgencyLevel;

  ReorderAlertItem({
    required this.productId,
    required this.productSku,
    required this.productName,
    required this.branchName,
    required this.currentStock,
    required this.averageDailySales,
    required this.leadTimeDays,
    required this.safetyStock,
    required this.reorderPoint,
    required this.recommendedOrderQuantity,
    required this.needsReorder,
    required this.daysOfSupplyRemaining,
    required this.urgencyLevel,
  });

  factory ReorderAlertItem.fromJson(Map<String, dynamic> json) {
    return ReorderAlertItem(
      productId: json['productId'] ?? '',
      productSku: json['productSku'] ?? '',
      productName: json['productName'] ?? '',
      branchName: json['branchName'] ?? 'Main Branch',
      currentStock: (json['currentStock'] as num?)?.toDouble() ?? 0.0,
      averageDailySales: (json['averageDailySales'] as num?)?.toDouble() ?? 0.0,
      leadTimeDays: (json['leadTimeDays'] as num?)?.toInt() ?? 7,
      safetyStock: (json['safetyStock'] as num?)?.toDouble() ?? 0.0,
      reorderPoint: (json['reorderPoint'] as num?)?.toDouble() ?? 0.0,
      recommendedOrderQuantity: (json['recommendedOrderQuantity'] as num?)?.toDouble() ?? 0.0,
      needsReorder: json['needsReorder'] ?? false,
      daysOfSupplyRemaining: (json['daysOfSupplyRemaining'] as num?)?.toInt() ?? 0,
      urgencyLevel: json['urgencyLevel'] ?? 'Normal',
    );
  }
}
