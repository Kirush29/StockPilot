import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Rs. Currency formatting works', () {
    String formatCurrency(double amount) {
      return 'Rs. ${amount.toStringAsFixed(2)}';
    }

    expect(formatCurrency(1500.5), 'Rs. 1500.50');
    expect(formatCurrency(0), 'Rs. 0.00');
  });

  test('Email validation works', () {
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    expect(emailRegex.hasMatch('test@domain.com'), true);
    expect(emailRegex.hasMatch('invalid-email'), false);
    expect(emailRegex.hasMatch('invalid@domain'), false);
  });

  test('Price and quantity validation works', () {
    bool isValidPrice(String value) {
      final parsed = double.tryParse(value);
      return parsed != null && parsed >= 0;
    }

    bool isValidQuantity(String value) {
      final parsed = double.tryParse(value);
      return parsed != null && parsed > 0;
    }

    expect(isValidPrice('150.00'), true);
    expect(isValidPrice('0'), true);
    expect(isValidPrice('-10'), false);
    expect(isValidPrice('abc'), false);

    expect(isValidQuantity('5'), true);
    expect(isValidQuantity('0'), false);
    expect(isValidQuantity('-1'), false);
  });

  test('Password complexity validation works', () {
    bool isValidPassword(String password) {
      return password.length >= 8 &&
          password.contains(RegExp(r'[A-Z]')) &&
          password.contains(RegExp(r'[a-z]')) &&
          password.contains(RegExp(r'[0-9]')) &&
          password.contains(RegExp(r'[!@#\$&*~]'));
    }

    expect(isValidPassword('short'), false);
    expect(isValidPassword('lowercase1!'), false);
    expect(isValidPassword('UPPERCASE1!'), false);
    expect(isValidPassword('NoSpecial1'), false);
    expect(isValidPassword('Valid123!'), true);
  });
}
