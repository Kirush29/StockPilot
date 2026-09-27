class AppConfig {
  static const String appName = 'StockPilot Mobile';
  static const String appVersion = '1.0.0';

  // 10.0.2.2 points to host localhost in Android Emulator; localhost for iOS/desktop
  static const String baseUrl = 'http://10.0.2.2:5004';

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
