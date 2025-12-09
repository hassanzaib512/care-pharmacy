import 'dart:convert';

import 'package:flutter/material.dart';

import '../models/order.dart';
import '../services/api_client.dart';
import '../services/order_api_service.dart';

class ActionResult {
  final bool success;
  final String message;
  final String? id;

  const ActionResult({required this.success, required this.message, this.id});
}

class OrderProvider extends ChangeNotifier {
  final List<Order> _orders = [];
  bool _loading = false;
  final ApiClient _client = ApiClient();
  late final OrderApiService _api = OrderApiService(_client);

  List<Order> get orders => List.unmodifiable(_orders);
  bool get loading => _loading;

  double get totalSpend {
    return _orders.fold(0.0, (sum, order) => sum + order.total);
  }

  Order? findById(String id) {
    try {
      return _orders.firstWhere((o) => o.id == id);
    } catch (_) {
      return null;
    }
  }

  void updateToken(String? token) {
    _client.updateToken(token);
  }

  Future<void> fetchOrders() async {
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.fetchOrders();
      _orders
        ..clear()
        ..addAll(
          data.map((o) => Order.fromJson(o)).toList(),
        );
    } catch (_) {
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  ActionResult _errorResult(String message) => ActionResult(success: false, message: message);

  Future<ActionResult> placeOrder(List<Map<String, dynamic>> items) async {
    try {
      final res = await _api.placeOrder(items);
      if (res == null) return _errorResult('Network error. Please try again.');
      dynamic decoded;
      try {
        decoded = res.body.isNotEmpty ? jsonDecode(res.body) : {};
      } catch (_) {
        decoded = res.body;
      }
      final body = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      final rawMessage = decoded is String ? decoded : body['message'];
      final message = (rawMessage ?? 'Unable to place order.').toString();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = body['data'];
        String? createdId;
        if (data is Map<String, dynamic>) {
          final order = Order.fromJson(data);
          createdId = order.id;
        }
        await fetchOrders();
        return ActionResult(
          success: true,
          message: body['message']?.toString() ?? 'Order placed successfully',
          id: createdId,
        );
      }
      return _errorResult(message);
    } catch (err) {
      return _errorResult('Unable to place order. ${err.toString()}');
    }
  }

  Future<Order?> fetchOrder(String id) async {
    try {
      final data = await _api.fetchOrder(id);
      if (data != null) {
        final order = Order.fromJson(data);
        final existingIndex = _orders.indexWhere((o) => o.id == order.id);
        if (existingIndex != -1) {
          _orders[existingIndex] = order;
        } else {
          _orders.insert(0, order);
        }
        notifyListeners();
        return order;
      }
    } catch (_) {}
    return null;
  }

  Future<ActionResult> cancelOrder(String id) async {
    try {
      final res = await _api.cancelOrder(id);
      if (res == null) return _errorResult('Network error. Please try again.');
      dynamic decoded;
      try {
        decoded = res.body.isNotEmpty ? jsonDecode(res.body) : {};
      } catch (_) {
        decoded = res.body;
      }
      final body = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      final rawMessage = decoded is String ? decoded : body['message'];
      final message = (rawMessage ?? 'Unable to cancel order.').toString();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = body['data'];
        if (data is! Map<String, dynamic>) {
          return _errorResult('Unexpected response from server.');
        }
        final updated = Order.fromJson(data);
        final idx = _orders.indexWhere((o) => o.id == updated.id);
        if (idx != -1) {
          _orders[idx] = updated;
        } else {
          _orders.insert(0, updated);
        }
        notifyListeners();
        return ActionResult(
          success: true,
          message: body['message']?.toString() ?? 'Order cancelled',
        );
      }
      return _errorResult(message);
    } catch (err) {
      return _errorResult('Unable to cancel order. ${err.toString()}');
    }
  }
}
