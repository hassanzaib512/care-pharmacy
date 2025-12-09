import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({String? token})
      : _token = token,
        baseUrl = kIsWeb ? 'http://localhost:3000/api' : 'http://10.0.2.2:3000/api';

  final String baseUrl;
  String? _token;

  String? get token => _token;

  void updateToken(String? token) {
    _token = token;
  }

  Future<http.Response> patch(String path, {Object? body}) {
    final uri = Uri.parse('$baseUrl$path');
    final encoded = body == null ? null : jsonEncode(body);
    return http.patch(uri, headers: _headers(), body: encoded);
  }

  Map<String, String> _headers() {
    final headers = <String, String>{
      HttpHeaders.contentTypeHeader: 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers[HttpHeaders.authorizationHeader] = 'Bearer $_token';
    }
    return headers;
  }

  Future<http.Response> get(String path, {Map<String, String>? params}) {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    return http.get(uri, headers: _headers());
  }

  Future<http.Response> post(String path, {Map<String, String>? params, Object? body}) {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    return http.post(uri, headers: _headers(), body: jsonEncode(body));
  }

  Future<http.Response> put(String path, {Object? body}) {
    final uri = Uri.parse('$baseUrl$path');
    return http.put(uri, headers: _headers(), body: jsonEncode(body));
  }
}
