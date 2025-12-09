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
      final decoded = _decode(res.body);
      String? message;
      if (decoded is Map<String, dynamic>) {
        if (decoded['message'] is String) message = decoded['message'] as String;
        if (message == null && decoded['error'] is String) message = decoded['error'] as String;
      } else if (decoded is String) {
        message = decoded;
      }
      return (null, message);
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

  Future<bool> requestPasswordReset(String email) async {
    try {
      final res = await _client.post('/auth/request-password-reset', body: {'email': email});
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<bool> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    try {
      final res = await _client.post(
        '/auth/reset-password',
        body: {'email': email, 'token': token, 'newPassword': newPassword},
      );
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmNewPassword,
  }) async {
    try {
      final res = await _client.post(
        '/auth/change-password',
        body: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
          'confirmNewPassword': confirmNewPassword,
        },
      );
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}
