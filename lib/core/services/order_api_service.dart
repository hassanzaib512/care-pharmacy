import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_client.dart';

class OrderApiService {
  OrderApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<http.Response?> placeOrder(List<Map<String, dynamic>> items) async {
    try {
      final res = await _client.post('/orders', body: {'items': items});
      return res;
    } catch (_) {
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> fetchOrders() async {
    try {
      final res = await _client.get('/orders');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          final list = decoded['data'];
          if (list is List) {
            return list.whereType<Map<String, dynamic>>().toList();
          }
        }
        return const [];
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>?> fetchOrder(String id) async {
    try {
      final res = await _client.get('/orders/$id');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          final data = decoded['data'];
          return data is Map<String, dynamic> ? data : null;
        }
      }
    } catch (_) {}
    return null;
  }

  Future<http.Response?> cancelOrder(String id) async {
    try {
      final res = await _client.patch('/orders/$id/cancel');
      return res;
    } catch (_) {
      return null;
    }
  }
}
