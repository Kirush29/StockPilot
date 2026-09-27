import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../shared/services/auth_service.dart';
import '../models/agent_workflow.dart';
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
  static const String defaultBaseUrl = 'http://10.0.2.2:5004';

  final String baseUrl;
  final http.Client _client;
  final Map<String, String> Function() _authHeaders;

  /// All parameters are optional; tests pass a fake [client], a [baseUrl] or an [authHeaders] source.
  ProcurementApiService({http.Client? client, String? baseUrl, Map<String, String> Function()? authHeaders})
      : _client = client ?? http.Client(),
        baseUrl = baseUrl ?? defaultBaseUrl,
        _authHeaders = authHeaders ?? (() => AuthService.instance.authHeaders);

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        ..._authHeaders(),
      };

  Future<List<PurchaseOrder>> getOrders({PurchaseOrderStatus? status}) async {
    final uri = Uri.parse('$baseUrl/api/procurement/orders').replace(queryParameters: {
      if (status != null) 'status': status.code.toString(),
      'pageSize': '50',
    });
    final response = await _client.get(uri, headers: _headers);
    _throwIfUnsuccessful(response);
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final items = body['items'] as List<dynamic>? ?? [];
    return items.map((i) => PurchaseOrder.fromJson(i as Map<String, dynamic>)).toList();
  }

  Future<PurchaseOrder> getOrderById(String id) async {
    final response = await _client.get(Uri.parse('$baseUrl/api/procurement/orders/$id'), headers: _headers);
    _throwIfUnsuccessful(response);
    return PurchaseOrder.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<PurchaseOrder> updateOrderStatus(String id, UpdateOrderStatusPayload payload) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/api/procurement/orders/$id/status'),
      headers: _headers,
      body: jsonEncode(payload.toJson()),
    );
    _throwIfUnsuccessful(response);
    return PurchaseOrder.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// Asks the Procurement Coordinator Agent to raise a proposal for a reorder signal. The agent
  /// stops at PendingApproval; checks that fail come back as a result (422/503), not an exception.
  Future<AgentWorkflowResult> startReorderWorkflow(ReorderWorkflowRequest request) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/agent-workflows/procurement/start'),
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );
    if (const {201, 422, 503}.contains(response.statusCode)) {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic> && body['workflowId'] != null) return AgentWorkflowResult.fromJson(body);
    }
    _throwIfUnsuccessful(response);
    return AgentWorkflowResult.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  /// Workflow status including the live status of its proposal, so the initiator can see a decision.
  Future<AgentWorkflowStatus> getWorkflow(String workflowId) async {
    final response = await _client.get(Uri.parse('$baseUrl/api/agent-workflows/$workflowId'), headers: _headers);
    _throwIfUnsuccessful(response);
    return AgentWorkflowStatus.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
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
