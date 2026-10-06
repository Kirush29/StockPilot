class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? errors;

  /// The response body, when there was one (some endpoints return a result with a 4xx/5xx status).
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.errors,
    this.data,
  });

  @override
  String toString() => message;
}

class ForbiddenException extends ApiException {
  ForbiddenException({String? message})
      : super(
          message:
              message ?? 'You do not have permission to perform this action.',
          statusCode: 403,
        );
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({String? message})
      : super(
          message: message ?? 'Session expired or invalid identity.',
          statusCode: 401,
        );
}
