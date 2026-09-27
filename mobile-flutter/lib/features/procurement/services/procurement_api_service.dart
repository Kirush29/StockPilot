import '../../../core/api/api_client.dart';
import '../models/purchase_order.dart';

class ProcurementApiException implements Exception {
  final String message;
  final int? statusCode;
  ProcurementApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Calls the same ASP.NET Core procurement endpoints as the React web app
/// (web/stockpilot-web/src/api/procurementApi.js) — keep request/response shapes in sync.
class ProcurementApiService {
  final ApiClient _apiClient;

  ProcurementApiService(this._apiClient);

  Future<List<PurchaseOrder>> getOrders({PurchaseOrderStatus? status}) async {
    final Map<String, dynamic> query = {'pageSize': '50'};
    if (status != null) {
      query['status'] = status.code.toString();
    }

    final response = await _apiClient.get(
      '/api/procurement/orders',
      queryParameters: query,
    );

    if (response == null || response['items'] == null) return [];
    final items = response['items'] as List<dynamic>;
    return items
        .map((i) => PurchaseOrder.fromJson(i as Map<String, dynamic>))
        .toList();
  }

  Future<PurchaseOrder> getOrderById(String id) async {
    final response = await _apiClient.get('/api/procurement/orders/$id');
    if (response == null) throw ProcurementApiException('Order not found');
    return PurchaseOrder.fromJson(response as Map<String, dynamic>);
  }

  Future<PurchaseOrder> updateOrderStatus(
      String id, UpdateOrderStatusPayload payload) async {
    final response = await _apiClient.patch(
      '/api/procurement/orders/$id/status',
      data: payload.toJson(),
    );
    if (response == null) {
      throw ProcurementApiException('Failed to update order');
    }
    return PurchaseOrder.fromJson(response as Map<String, dynamic>);
  }
}
