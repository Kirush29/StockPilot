class AppConfig {
  static const String appName = 'StockPilot Mobile';
  static const String appVersion = '1.0.0';

  static const String _defaultProdUrl = 'https://stockpilot-api-mk4w.onrender.com';
  static const String _defaultDevUrl = 'http://10.0.2.2:5004';

  // Base API URL: configured via --dart-define=API_BASE_URL
  // Automatically defaults to production Render API in release mode, and local dev in debug mode.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: bool.fromEnvironment('dart.vm.product')
        ? _defaultProdUrl
        : _defaultDevUrl,
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
