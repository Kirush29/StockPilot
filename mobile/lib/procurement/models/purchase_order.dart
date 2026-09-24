// Mirrors the integer enum ordinals StockPilot.Procurement.Domain.Enums serializes as
// (System.Text.Json's default is numeric, not string). Kept in sync with
// web/stockpilot-web/src/utils/procurementEnums.js — update both together.
enum PurchaseOrderStatus {
  ordered,
  partiallyReceived,
  received,
  cancelled;

  static PurchaseOrderStatus fromCode(int code) => PurchaseOrderStatus.values[code];

  int get code => index;

  String get label => switch (this) {
        PurchaseOrderStatus.ordered => 'Ordered',
        PurchaseOrderStatus.partiallyReceived => 'Partially Received',
        PurchaseOrderStatus.received => 'Received',
        PurchaseOrderStatus.cancelled => 'Cancelled',
      };
}

class PurchaseOrderLineItem {
  final String id;
  final String productId;
  final int quantity;
  final double unitPrice;
  final double lineTotal;

  const PurchaseOrderLineItem({
    required this.id,
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory PurchaseOrderLineItem.fromJson(Map<String, dynamic> json) => PurchaseOrderLineItem(
        id: json['id'] ?? '',
        productId: json['productId'] ?? '',
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
        unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
        lineTotal: (json['lineTotal'] as num?)?.toDouble() ?? 0.0,
      );
}

class PurchaseOrderStatusHistoryEntry {
  final PurchaseOrderStatus? fromStatus;
  final PurchaseOrderStatus toStatus;
  final String changedByUserId;
  final DateTime changedAt;
  final String? notes;

  const PurchaseOrderStatusHistoryEntry({
    this.fromStatus,
    required this.toStatus,
    required this.changedByUserId,
    required this.changedAt,
    this.notes,
  });

  factory PurchaseOrderStatusHistoryEntry.fromJson(Map<String, dynamic> json) => PurchaseOrderStatusHistoryEntry(
        fromStatus: json['fromStatus'] != null ? PurchaseOrderStatus.fromCode((json['fromStatus'] as num).toInt()) : null,
        toStatus: PurchaseOrderStatus.fromCode((json['toStatus'] as num?)?.toInt() ?? 0),
        changedByUserId: json['changedByUserId'] ?? '',
        changedAt: DateTime.tryParse(json['changedAt'] ?? '') ?? DateTime.now(),
        notes: json['notes'],
      );
}

/// Serves both PurchaseOrderSummaryResponse and PurchaseOrderDetailResponse shapes —
/// list responses simply omit lineItems/statusHistory/updatedAt, which default to empty/null.
class PurchaseOrder {
  final String id;
  final String proposalId;
  final String supplierId;
  final String orderNumber;
  final PurchaseOrderStatus status;
  final double totalCost;
  final DateTime? expectedDeliveryDate;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<PurchaseOrderLineItem> lineItems;
  final List<PurchaseOrderStatusHistoryEntry> statusHistory;

  const PurchaseOrder({
    required this.id,
    required this.proposalId,
    required this.supplierId,
    required this.orderNumber,
    required this.status,
    required this.totalCost,
    this.expectedDeliveryDate,
    required this.createdAt,
    this.updatedAt,
    this.lineItems = const [],
    this.statusHistory = const [],
  });

  int get totalUnitsOrdered => lineItems.fold(0, (sum, li) => sum + li.quantity);

  factory PurchaseOrder.fromJson(Map<String, dynamic> json) => PurchaseOrder(
        id: json['id'] ?? '',
        proposalId: json['proposalId'] ?? '',
        supplierId: json['supplierId'] ?? '',
        orderNumber: json['orderNumber'] ?? '',
        status: PurchaseOrderStatus.fromCode((json['status'] as num?)?.toInt() ?? 0),
        totalCost: (json['totalCost'] as num?)?.toDouble() ?? 0.0,
        expectedDeliveryDate: json['expectedDeliveryDate'] != null ? DateTime.tryParse(json['expectedDeliveryDate']) : null,
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
        updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
        lineItems: (json['lineItems'] as List<dynamic>? ?? []).map((li) => PurchaseOrderLineItem.fromJson(li)).toList(),
        statusHistory: (json['statusHistory'] as List<dynamic>? ?? []).map((h) => PurchaseOrderStatusHistoryEntry.fromJson(h)).toList(),
      );
}

class UpdateOrderStatusPayload {
  final PurchaseOrderStatus status;
  final String? notes;

  const UpdateOrderStatusPayload({required this.status, this.notes});

  Map<String, dynamic> toJson() => {'status': status.code, 'notes': notes};
}
