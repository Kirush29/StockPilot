import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../models/user_info.dart';

final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient();
  client.onUnauthorized = () {
    ref.read(authStateProvider.notifier).logout();
  };
  return client;
});

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserInfo? user;
  final String? errorMessage;
  final String? permissionError;

  AuthState({
    this.isLoading = true,
    this.isAuthenticated = false,
    this.user,
    this.errorMessage,
    this.permissionError,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserInfo? user,
    String? errorMessage,
    String? permissionError,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: clearUser ? null : (user ?? this.user),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      permissionError:
          clearError ? null : (permissionError ?? this.permissionError),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;

  AuthNotifier(this._apiClient) : super(AuthState()) {
    checkSession();
  }

  Future<void> checkSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    final token = await TokenStorage.getToken();
    if (token == null || token.isEmpty) {
      state = state.copyWith(
          isLoading: false, isAuthenticated: false, clearUser: true);
      return;
    }

    try {
      final res = await _apiClient.get('/api/auth/me');
      if (res != null) {
        final user = UserInfo.fromJson(res);
        await TokenStorage.saveUserData(user.toRawJson());
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
      } else {
        await logout();
      }
    } catch (e) {
      await logout();
    }
  }

  Future<bool> login(String username, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final res = await _apiClient.post(
        '/api/auth/login',
        data: {'username': username, 'password': password},
      );

      if (res != null && res['accessToken'] != null) {
        final token = res['accessToken'].toString();
        await TokenStorage.saveToken(token);

        final userJson = res['user'];
        final user = UserInfo.fromJson(userJson);
        await TokenStorage.saveUserData(user.toRawJson());

        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: user,
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Invalid response from server.',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await TokenStorage.clearSession();
    state = AuthState(
      isLoading: false,
      isAuthenticated: false,
      user: null,
    );
  }

  void setPermissionError(String message) {
    state = state.copyWith(permissionError: message);
  }

  void clearPermissionError() {
    state = state.copyWith(clearError: true);
  }
}

final StateNotifierProvider<AuthNotifier, AuthState> authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthNotifier(apiClient);
});
