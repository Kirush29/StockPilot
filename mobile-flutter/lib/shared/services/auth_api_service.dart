import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/app_user.dart';

class AuthResult {
  final String accessToken;
  final AppUser user;
  const AuthResult({required this.accessToken, required this.user});
}

/// Calls the same POST /api/auth/login endpoint as web/stockpilot-web/src/api/authApi.js.
class AuthApiService {
  // 10.0.2.2 points to host localhost from the Android Emulator; localhost for iOS/desktop.
  static const String baseUrl = 'http://10.0.2.2:5004';

  Future<AuthResult> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode != 200) {
      throw Exception('Login failed. Check your credentials and that the backend is running.');
    }

    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return AuthResult(
      accessToken: body['accessToken'] as String,
      user: AppUser.fromJson(body['user'] as Map<String, dynamic>),
    );
  }
}
