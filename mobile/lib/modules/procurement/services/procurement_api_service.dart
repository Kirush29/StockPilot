import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/errors/api_exception.dart';
import '../models/agent_workflow.dart';
import '../models/purchase_order.dart';
import '../models/replenishment_workflow.dart';

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
      final response = await _postWorkflow('/api/agent-workflows/procurement/start', request.toJson());
      return AgentWorkflowResult.fromJson(response);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// Runs the multi-agent Replenishment Orchestrator for a product at a branch. It stops for a
  /// human decision; every outcome (including 422/503) comes back as a result, not an exception.
  Future<ReplenishmentResult> startReplenishment(ReplenishmentRequest request) async {
    try {
      final response = await _postWorkflow('/api/agent-workflows/replenishment/start', request.toJson());
      return ReplenishmentResult.fromJson(response);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// A replenishment run's result, its agent steps and the live status of any proposal it created.
  Future<ReplenishmentDetail> getReplenishment(String workflowId) async {
    try {
      final response = await _apiClient.get('/api/agent-workflows/replenishment/$workflowId');
      if (response == null) throw ProcurementApiException('Replenishment run not found');
      return ReplenishmentDetail.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      throw _wrap(e);
    }
  }

  /// Agent workflow endpoints answer 422/503 with the run's result in the body. The shared ApiClient
  /// turns those codes into exceptions, so the result is recovered from the error and returned as a
  /// result (as the Procurement module's original http-based service did).
  Future<Map<String, dynamic>> _postWorkflow(String path, Map<String, dynamic> body) async {
    dynamic data;
    int? status;
    try {
      data = await _apiClient.post(path, data: body);
      status = 201;
    } on ApiException catch (e) {
      data = e.data;
      status = e.statusCode;
      if (!_isResultStatus(status, data)) rethrow;
    } on DioException catch (e) {
      data = e.response?.data;
      status = e.response?.statusCode;
      if (!_isResultStatus(status, data)) rethrow;
    }
    if (data is Map<String, dynamic> && data['workflowId'] != null) return data;
    throw ProcurementApiException('No response from agent workflow', statusCode: status);
  }

  static bool _isResultStatus(int? status, dynamic data) =>
      (status == 422 || status == 503) && data is Map<String, dynamic> && data['workflowId'] != null;

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

