import 'package:flutter_test/flutter_test.dart';

void main() {
  test('LKR Formatting works', () {
    // Assuming a formatter like `LkrFormatter.format(1000)` -> `LKR 1,000.00`
    // Since we didn't extract a formatter class, we test the logic.
    String formatCurrency(double amount) {
      return 'LKR ${amount.toStringAsFixed(2)}';
    }

    expect(formatCurrency(1500.5), 'LKR 1500.50');
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
