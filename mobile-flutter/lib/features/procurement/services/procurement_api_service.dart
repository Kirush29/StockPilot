import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
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
  final ApiClient _apiClient;

  ProcurementApiService(this._apiClient);

  Future<List<PurchaseOrder>> getOrders({PurchaseOrderStatus? status}) async {
    final Map<String, dynamic> query = {'pageSize': '50'};
    if (status != null) {
      query['status'] = status.code.toString();
    }

    try {
      final response = await _apiClient.get(
        '/api/procurement/orders',
        queryParameters: query,
      );
      if (response == null || response['items'] == null) return [];
      final items = response['items'] as List<dynamic>;
      return items
          .map((i) => PurchaseOrder.fromJson(i as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _wrap(e);
    }
  }

  Future<PurchaseOrder> getOrderById(String id) async {
    try {
      final response = await _apiClient.get('/api/procurement/orders/$id');
      if (response == null) throw ProcurementApiException('Order not found');
      return PurchaseOrder.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw _wrap(e);
    }
  }

  Future<PurchaseOrder> updateOrderStatus(
      String id, UpdateOrderStatusPayload payload) async {
    try {
      final response = await _apiClient.patch(
        '/api/procurement/orders/$id/status',
        data: payload.toJson(),
      );
      if (response == null) {
        throw ProcurementApiException('Failed to update order');
      }
      return PurchaseOrder.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// Asks the Procurement Coordinator Agent to raise a proposal for a reorder
  /// signal. The agent stops at PendingApproval; checks that fail come back as
  /// a result (422/503), not an exception.
  ///
  /// Ported from: mobile-flutter/lib/procurement/services/procurement_api_service.dart
  Future<AgentWorkflowResult> startReorderWorkflow(
      ReorderWorkflowRequest request) async {
    try {
      final response = await _apiClient.post(
        '/api/agent-workflows/procurement/start',
        data: request.toJson(),
      );
      if (response == null) {
        throw ProcurementApiException('No response from agent workflow');
      }
      return AgentWorkflowResult.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// Workflow status including the live status of its proposal, so the
  /// initiator can see a decision.
  ///
  /// Ported from: mobile-flutter/lib/procurement/services/procurement_api_service.dart
  Future<AgentWorkflowStatus> getWorkflow(String workflowId) async {
    try {
      final response = await _apiClient.get('/api/agent-workflows/$workflowId');
      if (response == null) {
        throw ProcurementApiException('Workflow not found');
      }
      return AgentWorkflowStatus.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// Converts ApiClient/Dio exceptions into [ProcurementApiException] with
  /// human-readable messages, mirroring the RFC 7807 ProblemDetails parsing
  /// from the old http-based service.
  ProcurementApiException _wrap(Object e) {
    if (e is ProcurementApiException) return e;
    
    if (e is DioException) {
      final code = e.response?.statusCode;
      final data = e.response?.data;
      
      if (data is Map<String, dynamic> && data.containsKey('detail') && data['detail'] != null) {
        return ProcurementApiException(data['detail'].toString(), statusCode: code);
      }
      
      if (code == 401) return ProcurementApiException('Session expired. Please sign in again.', statusCode: 401);
      if (code == 403) return ProcurementApiException('You do not have permission to do that.', statusCode: 403);
      if (code == 404) return ProcurementApiException('Resource not found.', statusCode: 404);
      if (code != null) return ProcurementApiException('Request failed ($code).', statusCode: code);
    }
    
    final msg = e.toString();
    if (msg.contains('401') || msg.toLowerCase().contains('unauthorized')) {
      return ProcurementApiException('Session expired. Please sign in again.', statusCode: 401);
    }
    if (msg.contains('403') || msg.toLowerCase().contains('forbidden')) {
      return ProcurementApiException('You do not have permission to do that.', statusCode: 403);
    }
    if (msg.contains('404') || msg.toLowerCase().contains('not found')) {
      return ProcurementApiException('Resource not found.', statusCode: 404);
    }
    return ProcurementApiException(msg);
  }


}

