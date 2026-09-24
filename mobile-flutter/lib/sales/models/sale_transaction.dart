class SaleTransactionItem {
  final String productId;
  final String productSku;
  final String productName;
  final String category;
  final int quantity;
  final double unitPrice;
  final double discountPercent;

  SaleTransactionItem({
    required this.productId,
    required this.productSku,
    required this.productName,
    required this.category,
    required this.quantity,
    required this.unitPrice,
    this.discountPercent = 0.0,
  });

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'productSku': productSku,
    'productName': productName,
    'category': category,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'discountPercent': discountPercent,
  };
}

class CreateSalePayload {
  final String branchName;
  final int paymentMethod; // 1 = Cash, 2 = Card
  final String? customerReference;
  final String? notes;
  final List<SaleTransactionItem> items;

  CreateSalePayload({
    required this.branchName,
    this.paymentMethod = 1,
    this.customerReference,
    this.notes,
    required this.items,
  });

  Map<String, dynamic> toJson() => {
    'branchName': branchName,
    'paymentMethod': paymentMethod,
    'customerReference': customerReference,
    'notes': notes,
    'items': items.map((i) => i.toJson()).toList(),
  };
}
