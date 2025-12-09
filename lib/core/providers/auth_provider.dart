import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_user.dart';
import '../services/api_client.dart';
import '../services/auth_api_service.dart';
import '../services/push_notification_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _currentUser;
  String? _token;
  final ApiClient _client = ApiClient();
  late final AuthApiService _authApi = AuthApiService(_client);

  bool get isLoggedIn => _currentUser != null;
  String? get currentEmail => _currentUser?.email;
  AppUser? get currentUser => _currentUser;
  String? get token => _token;
  AuthApiService get api => _authApi;

  AuthProvider() {
    _restoreSession();
  }

  Future<void> _persistSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (_token != null && _token!.isNotEmpty) {
      await prefs.setString('auth_token', _token!);
    }
  }

  Future<void> _clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  Future<void> _restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('auth_token');
    if (saved == null || saved.isEmpty) return;
    _token = saved;
    _client.updateToken(saved);
    PushNotificationService.instance.updateAuthToken(saved);
    await loadMe();
    await PushNotificationService.instance.syncTokenWithBackend();
  }

  Future<void> _syncPushToken() async {
    PushNotificationService.instance.updateAuthToken(_token);
    await PushNotificationService.instance.syncTokenWithBackend();
  }

  // API login only (no dummy fallback)
  Future<bool> login(String email, String password) async {
    final result = await _authApi.login(email: email, password: password);
    final user = result.$1;
    final token = result.$2;
    if (user != null && token != null) {
      _token = token;
      _client.updateToken(token);
      _currentUser = user;
      await _persistSession();
      await _syncPushToken();
      notifyListeners();
      return true;
    }
    return false;
  }

  // API signup only (no dummy fallback)
  Future<bool> signup(String name, String email, String password) async {
    _client.updateToken(null);
    final result =
        await _authApi.register(name: name, email: email, password: password);
    final user = result.$1;
    final tokenOrError = result.$2;
    if (user != null && tokenOrError != null) {
      _token = tokenOrError;
      _client.updateToken(tokenOrError);
      _currentUser = user;
      await _persistSession();
      await _syncPushToken();
      notifyListeners();
      _lastSignupError = null;
      return true;
    }
    _lastSignupError = tokenOrError is String ? tokenOrError : null;
    return false;
  }

  String? _lastSignupError;
  String? get lastSignupError => _lastSignupError;

  Future<bool> loginWithGoogle(String idToken) async {
    final result = await _authApi.loginWithGoogle(idToken: idToken);
    final user = result.$1;
    final token = result.$2;
    if (user != null && token != null) {
      _token = token;
      _client.updateToken(token);
      _currentUser = user;
      await _persistSession();
      await _syncPushToken();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    await PushNotificationService.instance.unregisterDeviceToken();
    _currentUser = null;
    _token = null;
    _client.updateToken(null);
    PushNotificationService.instance.updateAuthToken(null);
    await _clearSession();
    notifyListeners();
  }

  Future<void> loadMe() async {
    if (_token == null) return;
    final me = await _authApi.fetchMe();
    if (me != null) {
      _currentUser = me;
      notifyListeners();
    } else {
      _currentUser = null;
      _token = null;
      _client.updateToken(null);
      await _clearSession();
    }
  }
}
