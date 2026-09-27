import 'package:dio/dio.dart';
import '../../config/app_config.dart';
import '../errors/api_exception.dart';
import '../storage/token_storage.dart';

class ApiClient {
  late final Dio dio;
  Function()? onUnauthorized;

  ApiClient({this.onUnauthorized}) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          return handler.next(response);
        },
        onError: (DioException e, handler) {
          if (e.response?.statusCode == 401) {
            onUnauthorized?.call();
            return handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                error: UnauthorizedException(),
              ),
            );
          }
          if (e.response?.statusCode == 403) {
            final detail = _extractDetail(e.response?.data) ??
                'You do not have permission to perform this action.';
            return handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                error: ForbiddenException(message: detail),
              ),
            );
          }

          final detail = _extractDetail(e.response?.data) ??
              e.message ??
              'HTTP Error ${e.response?.statusCode}';
          return handler.reject(
            DioException(
              requestOptions: e.requestOptions,
              error: ApiException(
                message: detail,
                statusCode: e.response?.statusCode,
              ),
            ),
          );
        },
      ),
    );
  }

  String? _extractDetail(dynamic data) {
    if (data is Map<String, dynamic>) {
      if (data.containsKey('detail') && data['detail'] != null) {
        return data['detail'].toString();
      }
      if (data.containsKey('title') && data['title'] != null) {
        return data['title'].toString();
      }
      if (data.containsKey('message') && data['message'] != null) {
        return data['message'].toString();
      }
    }
    return null;
  }

  Future<dynamic> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      final res = await dio.get(path, queryParameters: queryParameters);
      return res.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error!;
      throw ApiException(message: e.message ?? 'Network connection failure');
    }
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      final res = await dio.post(path, data: data);
      return res.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error!;
      throw ApiException(message: e.message ?? 'Network connection failure');
    }
  }

  Future<dynamic> put(String path, {dynamic data}) async {
    try {
      final res = await dio.put(path, data: data);
      return res.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error!;
      throw ApiException(message: e.message ?? 'Network connection failure');
    }
  }

  Future<dynamic> patch(String path, {dynamic data}) async {
    try {
      final res = await dio.patch(path, data: data);
      return res.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error!;
      throw ApiException(message: e.message ?? 'Network connection failure');
    }
  }
}
