import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:stockpilot_mobile/procurement/services/procurement_api_service.dart';

/// In-memory stand-in for the procurement order endpoints (GET list, GET detail, PATCH status),
/// behind the real [ProcurementApiService] via package:http's MockClient.
class FakeProcurementBackend {
  final List<Map<String, dynamic>> orders;
  final List<http.Request> requests = [];

  /// When set, every request gets this status and body instead of the normal response.
  int? failWithStatus;
  String failBody = '{"title":"Server error","detail":"Something went wrong."}';

  FakeProcurementBackend(this.orders);

  ProcurementApiService service() => ProcurementApiService(
        client: MockClient(_handle),
        baseUrl: 'http://api.test',
        authHeaders: () => {'Authorization': 'Bearer test-token'},
      );

  Future<http.Response> _handle(http.Request request) async {
    requests.add(request);
    if (failWithStatus != null) return http.Response(failBody, failWithStatus!);

    final segments = request.url.pathSegments; // api, procurement, orders, {id}?, status?
    if (request.method == 'GET' && segments.length == 3) {
      final status = request.url.queryParameters['status'];
      final items = orders.where((o) => status == null || o['status'].toString() == status).map(_summary).toList();
      return _json({'items': items, 'page': 1, 'pageSize': 50, 'totalCount': items.length});
    }

    final order = orders.firstWhere((o) => o['id'] == segments[3], orElse: () => {});
    if (order.isEmpty) return http.Response('{"title":"Resource not found","detail":"Purchase order not found."}', 404);

    if (request.method == 'GET') return _json(order);

    if (request.method == 'PATCH' && segments.length == 5) {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      order['status'] = body['status'];
      return _json(order);
    }

    return http.Response('', 405);
  }

  static Map<String, dynamic> _summary(Map<String, dynamic> o) => {
        for (final key in ['id', 'proposalId', 'supplierId', 'orderNumber', 'status', 'totalCost', 'expectedDeliveryDate', 'createdAt']) key: o[key],
      };

  static http.Response _json(Object body) =>
      http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json'});
}

Map<String, dynamic> orderJson({
  required String id,
  required String number,
  int status = 0,
  double totalCost = 1500,
  List<Map<String, dynamic>> lines = const [],
}) =>
    {
      'id': id,
      'proposalId': 'prop-$id',
      'supplierId': 'sup-1',
      'orderNumber': number,
      'status': status,
      'totalCost': totalCost,
      'expectedDeliveryDate': null,
      'createdAt': '2026-09-20T09:00:00Z',
      'updatedAt': '2026-09-20T09:00:00Z',
      'lineItems': lines,
      'statusHistory': [],
    };

Map<String, dynamic> lineJson(String productId, int quantity, {double unitPrice = 100}) => {
      'id': 'li-$productId',
      'productId': productId,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'lineTotal': quantity * unitPrice,
    };
