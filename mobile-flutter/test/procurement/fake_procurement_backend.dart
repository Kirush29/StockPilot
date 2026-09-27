import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:stockpilot_mobile/core/api/api_client.dart';
import 'package:stockpilot_mobile/features/procurement/models/purchase_order.dart';
import 'package:stockpilot_mobile/features/procurement/services/procurement_api_service.dart';

/// In-memory stand-in for the procurement order endpoints (GET list, GET
/// detail, PATCH status) behind the real [ProcurementApiService] via a
/// Dio [HttpClientAdapter] shim.
///
/// Replaces the old package:http MockClient variant that relied on the
/// deleted lib/procurement/services/ architecture.
class FakeProcurementBackend {
  final List<Map<String, dynamic>> orders;
  final List<String> requests = [];

  /// When set, every request gets this status instead of the normal response.
  int? failWithStatus;
  String failBody = '{"title":"Server error","detail":"Something went wrong."}';

  FakeProcurementBackend(this.orders);

  /// Returns a [ProcurementApiService] wired to this fake backend via a
  /// custom Dio adapter — no real HTTP calls are made.
  ProcurementApiService service() {
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'));
    dio.httpClientAdapter = _FakeAdapter(this);
    final client = _FakeApiClient(dio);
    return ProcurementApiService(client);
  }

  Map<String, dynamic> _handleRequest(String method, Uri uri, String? body) {
    requests.add('$method ${uri.path}');

    if (failWithStatus != null) {
      throw _statusError(failWithStatus!, failBody);
    }

    final segments = uri.pathSegments; // ['api','procurement','orders',...]

    if (method == 'GET' && segments.length == 3) {
      // GET /api/procurement/orders
      final status = uri.queryParameters['status'];
      final items = orders
          .where((o) => status == null || o['status'].toString() == status)
          .map(_summary)
          .toList();
      return {
        'items': items,
        'page': 1,
        'pageSize': 50,
        'totalCount': items.length
      };
    }

    if (segments.length >= 4) {
      final id = segments[3];
      final idx = orders.indexWhere((o) => o['id'] == id);
      if (idx == -1) {
        throw _statusError(
            404,
            '{"title":"Resource not found",'
            '"detail":"Purchase order not found."}');
      }

      if (method == 'GET' && segments.length == 4) {
        return Map<String, dynamic>.from(orders[idx]);
      }

      if (method == 'PATCH' && segments.length == 5) {
        final patch = jsonDecode(body ?? '{}') as Map<String, dynamic>;
        orders[idx]['status'] = patch['status'];
        return Map<String, dynamic>.from(orders[idx]);
      }
    }

    throw _statusError(405, '');
  }

  static DioException _statusError(int status, String body) => DioException(
        requestOptions: RequestOptions(),
        response: Response(
          requestOptions: RequestOptions(),
          statusCode: status,
          data: body.isEmpty ? null : jsonDecode(body),
        ),
        type: DioExceptionType.badResponse,
      );

  static Map<String, dynamic> _summary(Map<String, dynamic> o) => {
        for (final key in [
          'id',
          'proposalId',
          'supplierId',
          'orderNumber',
          'status',
          'totalCost',
          'expectedDeliveryDate',
          'createdAt'
        ])
          key: o[key],
      };
}

/// A minimal [ApiClient] that delegates to a pre-configured [Dio] instance
/// (the one carrying [_FakeAdapter]).
class _FakeApiClient extends ApiClient {
  final Dio _dio;

  _FakeApiClient(this._dio) : super();

  @override
  Future<dynamic> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    final res = await _dio.get(path, queryParameters: queryParameters);
    return res.data;
  }

  @override
  Future<dynamic> post(String path, {dynamic data}) async {
    final res = await _dio.post(path, data: data);
    return res.data;
  }

  @override
  Future<dynamic> patch(String path, {dynamic data}) async {
    final res =
        await _dio.patch(path, data: data is Map ? jsonEncode(data) : data);
    return res.data;
  }

  @override
  Future<dynamic> put(String path, {dynamic data}) async {
    final res = await _dio.put(path, data: data);
    return res.data;
  }
}

/// A [HttpClientAdapter] that routes every request to [FakeProcurementBackend].
class _FakeAdapter implements HttpClientAdapter {
  final FakeProcurementBackend _backend;
  _FakeAdapter(this._backend);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    String? body;
    if (requestStream != null) {
      final bytes = <int>[];
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
      body = utf8.decode(bytes);
    }

    final result = _backend._handleRequest(
      options.method,
      options.uri,
      body,
    );
    final encoded = utf8.encode(jsonEncode(result));
    return ResponseBody.fromBytes(encoded, 200, headers: {
      'content-type': ['application/json']
    });
  }

  @override
  void close({bool force = false}) {}
}

// ── JSON helpers shared by all procurement tests ──────────────────────────

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

Map<String, dynamic> lineJson(String productId, int quantity,
        {double unitPrice = 100}) =>
    {
      'id': 'li-$productId',
      'productId': productId,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'lineTotal': quantity * unitPrice,
    };

/// Status code int → [PurchaseOrderStatus] for test assertions.
PurchaseOrderStatus statusFromCode(int code) =>
    PurchaseOrderStatus.values.firstWhere((s) => s.code == code,
        orElse: () => PurchaseOrderStatus.ordered);
