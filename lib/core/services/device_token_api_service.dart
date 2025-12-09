import 'dart:convert';

import 'api_client.dart';

class DeviceTokenApiService {
  DeviceTokenApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<bool> registerToken({required String token, required String platform}) async {
    try {
      final res = await _client.post(
        '/users/me/device-token',
        body: {'token': token, 'platform': platform},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return true;
      }
      _decode(res.body); // consume/parse for debugging if needed
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> removeToken(String token) async {
    try {
      final res = await _client.delete(
        '/users/me/device-token',
        body: {'token': token},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) return true;
      _decode(res.body);
      return false;
    } catch (_) {
      return false;
    }
  }
}
