using Microsoft.AspNetCore.Identity;
using System;

class Program {
    static void Main() {
        var hasher = new PasswordHasher<object>();
        var hash = hasher.HashPassword(null, "DevPassword123!");
        Console.WriteLine(hash);
        var verify = hasher.VerifyHashedPassword(null, "AQAAAAIAAYagAAAAENipBOnahM0Al6mYlKirMZRTcQUl6hXlLUB5SvsD/wBVFLJ55mW7cLqtzZZuKU3QlA==", "DevPassword123!");
        Console.WriteLine(verify);
    }
}
