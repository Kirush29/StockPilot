import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../shared/services/auth_service.dart';
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
  // 10.0.2.2 points to host localhost from the Android Emulator; localhost for iOS/desktop.
  static const String baseUrl = 'http://10.0.2.2:5004';

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        ...AuthService.instance.authHeaders,
      };

  Future<List<PurchaseOrder>> getOrders({PurchaseOrderStatus? status}) async {
    final uri = Uri.parse('$baseUrl/api/procurement/orders').replace(queryParameters: {
      if (status != null) 'status': status.code.toString(),
      'pageSize': '50',
    });
    final response = await http.get(uri, headers: _headers);
    _throwIfUnsuccessful(response);
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = body['items'] as List<dynamic>? ?? [];
    return items.map((i) => PurchaseOrder.fromJson(i as Map<String, dynamic>)).toList();
  }

  Future<PurchaseOrder> getOrderById(String id) async {
    final response = await http.get(Uri.parse('$baseUrl/api/procurement/orders/$id'), headers: _headers);
    _throwIfUnsuccessful(response);
    return PurchaseOrder.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<PurchaseOrder> updateOrderStatus(String id, UpdateOrderStatusPayload payload) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/procurement/orders/$id/status'),
      headers: _headers,
      body: jsonEncode(payload.toJson()),
    );
    _throwIfUnsuccessful(response);
    return PurchaseOrder.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  void _throwIfUnsuccessful(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;

    String message;
    try {
      final problem = jsonDecode(response.body) as Map<String, dynamic>;
      message = problem['detail'] ?? problem['title'] ?? 'Request failed (${response.statusCode}).';
    } catch (_) {
      message = response.statusCode == 401
          ? 'Session expired. Please sign in again.'
          : response.statusCode == 403
              ? 'You do not have permission to do that.'
              : 'Request failed (${response.statusCode}).';
    }
    throw ProcurementApiException(message, statusCode: response.statusCode);
  }
}
