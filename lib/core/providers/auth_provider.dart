import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../services/api_client.dart';
import '../services/auth_api_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _currentUser;
  String? _token;
  final ApiClient _client = ApiClient();
  late final AuthApiService _authApi = AuthApiService(_client);

  bool get isLoggedIn => _currentUser != null;
  String? get currentEmail => _currentUser?.email;
  AppUser? get currentUser => _currentUser;
  String? get token => _token;

  // API login only (no dummy fallback)
  Future<bool> login(String email, String password) async {
    final result = await _authApi.login(email: email, password: password);
    final user = result.$1;
    final token = result.$2;
    if (user != null && token != null) {
      _token = token;
      _client.updateToken(token);
      _currentUser = user;
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
    final token = result.$2;
    if (user != null && token != null) {
      _token = token;
      _client.updateToken(token);
      _currentUser = user;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> loginWithGoogle(String idToken) async {
    final result = await _authApi.loginWithGoogle(idToken: idToken);
    final user = result.$1;
    final token = result.$2;
    if (user != null && token != null) {
      _token = token;
      _client.updateToken(token);
      _currentUser = user;
      notifyListeners();
      return true;
    }
    return false;
  }

  void logout() {
    _currentUser = null;
    _token = null;
    _client.updateToken(null);
    notifyListeners();
  }

  Future<void> loadMe() async {
    if (_token == null) return;
    final me = await _authApi.fetchMe();
    if (me != null) {
      _currentUser = me;
      notifyListeners();
    }
  }
}
