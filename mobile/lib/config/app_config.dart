class AppConfig {
  static const String appName = 'StockPilot Mobile';
  static const String appVersion = '1.0.0';

  // Base API URL: configured via --dart-define=API_BASE_URL (defaults to http://10.0.2.2:5004)
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5004',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
