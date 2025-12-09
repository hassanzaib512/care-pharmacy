import 'package:flutter/material.dart';

import '../models/app_user.dart';
import '../models/payment_method.dart';
import '../services/api_client.dart';
import '../services/user_api_service.dart';

class ProfileProvider extends ChangeNotifier {
  final Map<String, AppUser> _profiles = {};
  final ApiClient _client = ApiClient();
  late final UserApiService _api = UserApiService(_client);

  AppUser profileFor(String email) {
    return _profiles[email] ?? AppUser(email: email);
  }

  void updateToken(String? token) {
    _client.updateToken(token);
  }

  Future<void> fetchProfile() async {
    final user = await _api.fetchMe();
    if (user != null) {
      _profiles[user.email] = user;
      notifyListeners();
    }
  }

  void updateProfile({
    required String email,
    required String name,
    required String phone,
    required String address,
  }) {
    _profiles[email] = profileFor(
      email,
    ).copyWith(name: name, phone: phone, address: address);
    notifyListeners();
  }

  Future<bool> saveAddressRemote({
    required String email,
    required String fullName,
    required String phone,
    required String line1,
    String? line2,
    required String city,
    required String zip,
  }) async {
    final updated = await _api.updateAddress(
      fullName: fullName,
      phone: phone,
      line1: line1,
      line2: line2,
      city: city,
      zip: zip,
    );
    if (updated != null) {
      _profiles[email] = updated;
      notifyListeners();
      return true;
    }
    updateProfile(
      email: email,
      name: fullName,
      phone: phone,
      address: [line1, line2 ?? '', city, zip]
          .where((e) => e.trim().isNotEmpty)
          .join(', '),
    );
    return false;
  }

  void setPaymentMethod({
    required String email,
    required PaymentMethod method,
  }) {
    _profiles[email] = profileFor(email).copyWith(defaultPaymentMethod: method);
    notifyListeners();
  }

  Future<bool> uploadAvatar(String filePath) async {
    final updated = await _api.uploadAvatar(filePath);
    if (updated != null) {
      _profiles[updated.email] = updated;
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> savePaymentMethodRemote({
    required String email,
    required String cardHolderName,
    required String cardNumber,
    required String expiry,
    required String brand,
  }) async {
    final updated = await _api.updatePaymentMethod(
      cardHolderName: cardHolderName,
      cardNumber: cardNumber,
      expiry: expiry,
      brand: brand,
    );
    if (updated != null) {
      _profiles[email] = updated;
      notifyListeners();
      return true;
    }
    return false;
  }
}
