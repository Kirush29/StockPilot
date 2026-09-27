import '../../../core/api/api_client.dart';
import '../models/sale_transaction.dart';
import '../models/demand_summary.dart';

class SalesApiService {
  final ApiClient _apiClient;

  SalesApiService(this._apiClient);

  Future<bool> recordSale(CreateSalePayload payload) async {
    try {
      await _apiClient.post(
        '/api/Sales',
        data: payload.toJson(),
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<List<ReorderAlertItem>> getReorderAlerts() async {
    try {
      final response = await _apiClient.get(
        '/api/demand/reorder-suggestions',
      );
      if (response != null && response is List) {
        return response.map((json) => ReorderAlertItem.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
