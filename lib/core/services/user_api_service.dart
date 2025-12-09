import 'dart:convert';

import '../models/app_user.dart';
import 'api_client.dart';
import 'package:http/http.dart' as http;

class UserApiService {
  UserApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<AppUser?> fetchMe() async {
    try {
      final res = await _client.get('/users/me');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final userJson = data['data'] is Map ? data['data'] as Map<String, dynamic> : null;
        return userJson != null ? AppUser.fromJson(userJson) : null;
      }
    } catch (_) {}
    return null;
  }

  Future<AppUser?> updateAddress({
    required String fullName,
    required String phone,
    required String line1,
    String? line2,
    required String city,
    required String zip,
  }) async {
    try {
      final res = await _client.put(
        '/users/me/address',
        body: {
          'fullName': fullName,
          'phone': phone,
          'line1': line1,
          'line2': line2 ?? '',
          'city': city,
          'zip': zip,
        },
      );
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final userJson = data['data'] is Map ? data['data'] as Map<String, dynamic> : null;
        return userJson != null ? AppUser.fromJson(userJson) : null;
      }
    } catch (_) {}
    return null;
  }

  Future<AppUser?> updatePaymentMethod({
    required String cardHolderName,
    required String cardNumber,
    required String expiry,
    required String brand,
  }) async {
    try {
      final res = await _client.put(
        '/users/me/payment-method',
        body: {
          'cardHolderName': cardHolderName,
          'cardNumber': cardNumber,
          'expiry': expiry,
          'brand': brand,
        },
      );
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final userJson = data['data'] is Map ? data['data'] as Map<String, dynamic> : null;
        return userJson != null ? AppUser.fromJson(userJson) : null;
      }
    } catch (_) {}
    return null;
  }

  Future<AppUser?> uploadAvatar(String filePath) async {
    try {
      final uri = Uri.parse('${_client.baseUrl}/users/me/avatar');
      final request = http.MultipartRequest('PUT', uri);
      if (_client.token != null && _client.token!.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer ${_client.token}';
      }
      request.files.add(await http.MultipartFile.fromPath('avatar', filePath));
      final streamed = await request.send();
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final userJson = data['data'] is Map ? data['data'] as Map<String, dynamic> : null;
        return userJson != null ? AppUser.fromJson(userJson) : null;
      }
    } catch (_) {}
    return null;
  }
}
