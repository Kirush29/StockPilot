import 'package:flutter_test/flutter_test.dart';
import 'package:stockpilot_mobile/shared/auth/models/user_info.dart';
import 'package:stockpilot_mobile/modules/procurement/models/purchase_order.dart';

void main() {
  test('UserInfo parsing works', () {
    final json = {
      'id': '123',
      'username': 'john',
      'email': 'john@example.com',
      'firstName': 'John',
      'lastName': 'Doe',
      'role': 'Admin',
    };
    final user = UserInfo.fromJson(json);
    expect(user.username, 'john');
    expect(user.role, 'Admin');
  });

  test('PurchaseOrder parsing works', () {
    final json = {
      'id': 'po1',
      'orderNumber': 'PO-001',
      'supplierId': 'sup1',
      'supplierName': 'Sup 1',
      'totalCost': 100.0,
      'status': 1,
      'createdAt': '2023-01-01T00:00:00Z',
    };
    final order = PurchaseOrder.fromJson(json);
    expect(order.id, 'po1');
    expect(order.orderNumber, 'PO-001');
    expect(order.status, PurchaseOrderStatus.partiallyReceived);
  });
}
