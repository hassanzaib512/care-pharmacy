import 'dart:convert';

import '../models/app_user.dart';
import 'api_client.dart';

class AuthApiService {
  AuthApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<(AppUser?, String?)> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final res = await _client.post(
        '/auth/register',
        body: {
          'name': name,
          'email': email,
          'password': password,
        },
      );
      if (res.statusCode == 201) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final token = data['token'] is String ? data['token'] as String : null;
        final userJson = data['user'] is Map ? data['user'] as Map<String, dynamic> : null;
        final user = userJson != null ? AppUser.fromJson(userJson) : null;
        if (token != null) _client.updateToken(token);
        return (user, token);
      }
      return (null, null);
    } catch (_) {
      return (null, null);
    }
  }

  Future<(AppUser?, String?)> login({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _client.post(
        '/auth/login',
        body: {'email': email, 'password': password},
      );
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final token = data['token'] is String ? data['token'] as String : null;
        final userJson = data['user'] is Map ? data['user'] as Map<String, dynamic> : null;
        final user = userJson != null ? AppUser.fromJson(userJson) : null;
        if (token != null) _client.updateToken(token);
        return (user, token);
      }
      return (null, null);
    } catch (_) {
      return (null, null);
    }
  }

  Future<(AppUser?, String?)> loginWithGoogle({
    required String idToken,
  }) async {
    try {
      final res = await _client.post(
        '/auth/google',
        body: {'idToken': idToken},
      );
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final token = data['token'] is String ? data['token'] as String : null;
        final userJson = data['user'] is Map ? data['user'] as Map<String, dynamic> : null;
        final user = userJson != null ? AppUser.fromJson(userJson) : null;
        if (token != null) _client.updateToken(token);
        return (user, token);
      }
      return (null, null);
    } catch (_) {
      return (null, null);
    }
  }

  Future<AppUser?> fetchMe() async {
    try {
      final res = await _client.get('/auth/me');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        final data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
        final userJson = data['user'] is Map ? data['user'] as Map<String, dynamic> : null;
        return userJson != null ? AppUser.fromJson(userJson) : null;
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
