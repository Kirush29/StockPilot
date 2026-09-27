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
  static const String defaultBaseUrl = 'http://10.0.2.2:5004';

  final String baseUrl;
  final http.Client _client;

  AuthApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        baseUrl = baseUrl ?? defaultBaseUrl;

  /// [email] may also be a username: the backend's LoginRequestDto has a single Username field
  /// and matches it against either. Sending the key "email" left Username empty, so every
  /// mobile login was rejected with 401.
  Future<AuthResult> login(String email, String password) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': email, 'password': password}),
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
