import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/sale_transaction.dart';
import '../models/demand_summary.dart';

class SalesApiService {
  // 10.0.2.2 points to host localhost in Android Emulator; localhost for iOS/desktop
  static const String baseUrl = 'http://10.0.2.2:5004/api/v1';

  Future<bool> recordSale(CreateSalePayload payload) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/Sales'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload.toJson()),
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<List<ReorderAlertItem>> getReorderAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/demand/reorder-suggestions'),
        headers: {'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => ReorderAlertItem.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
