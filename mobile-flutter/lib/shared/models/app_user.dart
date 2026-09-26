/// Mirrors UserInfoDto from POST /api/auth/login (backend/StockPilot.API/DTOs/Auth/LoginResponseDto.cs).
class AppUser {
  final String userId;
  final String fullName;
  final String email;
  final String role;

  const AppUser({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        userId: json['userId'] ?? '',
        fullName: json['fullName'] ?? '',
        email: json['email'] ?? '',
        role: json['role'] ?? '',
      );

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'fullName': fullName,
        'email': email,
        'role': role,
      };
}
