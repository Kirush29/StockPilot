import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'jwt_access_token';
  static const _userDataKey = 'user_profile_data';

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  static Future<void> saveUserData(String jsonStr) async {
    await _storage.write(key: _userDataKey, value: jsonStr);
  }

  static Future<String?> getUserData() async {
    return await _storage.read(key: _userDataKey);
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userDataKey);
  }
}
