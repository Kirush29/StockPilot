import 'dart:convert';

class UserInfo {
  final String userId;
  final String username;
  final String fullName;
  final String email;
  final String? phoneNumber;
  final String role;
  final String? branchId;
  final String? profileImageUrl;

  UserInfo({
    required this.userId,
    required this.username,
    required this.fullName,
    required this.email,
    this.phoneNumber,
    required this.role,
    this.branchId,
    this.profileImageUrl,
  });

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      userId: json['userId']?.toString() ?? json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString(),
      role: json['role']?.toString() ?? '',
      branchId: json['branchId']?.toString(),
      profileImageUrl: json['profileImageUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'username': username,
      'fullName': fullName,
      'email': email,
      'phoneNumber': phoneNumber,
      'role': role,
      'branchId': branchId,
      'profileImageUrl': profileImageUrl,
    };
  }

  String toRawJson() => json.encode(toJson());

  factory UserInfo.fromRawJson(String str) =>
      UserInfo.fromJson(json.decode(str));
}
