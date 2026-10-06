import 'package:flutter/material.dart';

/// Shared design tokens for the whole mobile app, taken from the Inventory module's theme (Student 1:
/// purple primary, indigo secondary, slate background, white cards with grey borders). Every module's
/// screens use these through [AppTheme.lightTheme]; screens that need a colour in a `const` context use
/// the tokens directly instead of hard-coded values.
class AppTokens {
  AppTokens._();

  // Brand (Inventory module theme: Colors.purple.shade700 / Colors.indigo.shade600)
  static const primary = Color(0xFF7B1FA2);
  static const secondary = Color(0xFF3949AB);

  // Surfaces
  static const background = Color(0xFFF8FAFC);
  static const surface = Colors.white;
  static const border = Color(0xFFEEEEEE); // grey.shade200
  static const inputBorder = Color(0xFFE0E0E0); // grey.shade300

  // Text
  static const textPrimary = Color(0xDD000000); // black87
  static const textSecondary = Color(0x8A000000); // black54
  static const textMuted = Color(0xFF9E9E9E); // grey

  // Status
  static const success = Color(0xFF2E7D32); // green.shade800
  static const warning = Color(0xFFEF6C00); // orange.shade800
  static const danger = Color(0xFFD32F2F); // red.shade700

  // Shape
  static const radiusSmall = 8.0;
  static const radiusCard = 12.0;
}

class AppTheme {
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppTokens.primary,
      primary: AppTokens.primary,
      secondary: AppTokens.secondary,
      surface: AppTokens.surface,
      error: AppTokens.danger,
    );
    final buttonShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.radiusSmall));
    const buttonPadding = EdgeInsets.symmetric(vertical: 14, horizontal: 20);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppTokens.background,
      textTheme: const TextTheme(
        headlineSmall: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTokens.textPrimary),
        titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTokens.textPrimary),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTokens.textPrimary),
        bodyLarge: TextStyle(fontSize: 16, color: AppTokens.textPrimary),
        bodyMedium: TextStyle(fontSize: 14, color: AppTokens.textPrimary),
        bodySmall: TextStyle(fontSize: 12, color: AppTokens.textSecondary),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        iconTheme: IconThemeData(color: AppTokens.textPrimary),
        titleTextStyle: TextStyle(color: AppTokens.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
      ),
      cardTheme: CardThemeData(
        color: AppTokens.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusCard),
          side: const BorderSide(color: AppTokens.border),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppTokens.border),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSmall),
          borderSide: const BorderSide(color: AppTokens.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSmall),
          borderSide: const BorderSide(color: AppTokens.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSmall),
          borderSide: const BorderSide(color: AppTokens.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusSmall),
          borderSide: const BorderSide(color: AppTokens.danger, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.primary,
          foregroundColor: Colors.white,
          padding: buttonPadding,
          shape: buttonShape,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppTokens.primary,
          foregroundColor: Colors.white,
          padding: buttonPadding,
          shape: buttonShape,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTokens.primary,
          side: const BorderSide(color: AppTokens.primary),
          padding: buttonPadding,
          shape: buttonShape,
        ),
      ),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppTokens.primary)),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: AppTokens.primary),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: AppTokens.primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
      ),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dialogTheme: DialogThemeData(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTokens.radiusCard)),
      ),
    );
  }
}
