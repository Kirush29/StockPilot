import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/app_user.dart';

/// Session service every module's API layer should read from instead of managing its own
/// token storage. Persists the JWT issued by POST /api/auth/login in the platform secure
/// keystore (mirrors web/stockpilot-web/src/context/AuthContext.jsx, which does the same
/// with localStorage). No login screen ships with the procurement module itself — call
/// [saveSession] from wherever the shared login flow lands.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'stockpilot_token';
  static const _userKey = 'stockpilot_user';

  String? _token;
  AppUser? _user;
  bool _restored = false;

  String? get token => _token;
  AppUser? get user => _user;
  bool get isAuthenticated => _token != null && _user != null;
  bool get isRestored => _restored;

  bool hasAnyRole(Iterable<String> roles) => _user != null && roles.contains(_user!.role);

  Future<void> restoreSession() async {
    _token = await _storage.read(key: _tokenKey);
    final userJson = await _storage.read(key: _userKey);
    _user = userJson != null ? AppUser.fromJson(jsonDecode(userJson)) : null;
    _restored = true;
    notifyListeners();
  }

  Future<void> saveSession(String accessToken, AppUser user) async {
    _token = accessToken;
    _user = user;
    await _storage.write(key: _tokenKey, value: accessToken);
    await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
    notifyListeners();
  }

  Future<void> signOut() async {
    _token = null;
    _user = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
    notifyListeners();
  }

  /// Headers to merge into every authenticated request.
  Map<String, String> get authHeaders => _token != null ? {'Authorization': 'Bearer $_token'} : {};
}
