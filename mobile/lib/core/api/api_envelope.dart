// The Inventory (Student 1) API wraps its payloads as `{ success, data, message }` (ApiResponse).
// These helpers read the payload whether or not it is wrapped.

List<Map<String, dynamic>> unwrapList(dynamic response) {
  final payload = response is Map<String, dynamic> && response.containsKey('data') ? response['data'] : response;
  return payload is List ? payload.whereType<Map<String, dynamic>>().toList() : [];
}

Map<String, dynamic>? unwrapObject(dynamic response) {
  final payload = response is Map<String, dynamic> && response.containsKey('data') && response.containsKey('success')
      ? response['data']
      : response;
  return payload is Map<String, dynamic> ? payload : null;
}
