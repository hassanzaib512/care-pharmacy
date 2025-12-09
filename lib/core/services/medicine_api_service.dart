import 'dart:convert';

import '../models/medicine.dart';
import 'api_client.dart';

class MedicineApiService {
  MedicineApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<String?> fetchSeason() async {
    try {
      final res = await _client.get('/season');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          return decoded['season']?.toString();
        }
      }
    } catch (_) {}
    return null;
  }

  Future<(List<Medicine>, int, int)> fetchMedicines({
    String? search,
    String? category,
    String? composition,
    String? tag,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final params = <String, String>{
        'page': '$page',
        'limit': '$limit',
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (composition != null && composition.isNotEmpty) 'composition': composition,
        if (tag != null && tag.isNotEmpty) 'tag': tag,
      };
      final res = await _client.get('/medicines', params: params);
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          final items = (decoded['data'] as List<dynamic>? ?? [])
              .whereType<Map<String, dynamic>>()
              .map(Medicine.fromJson)
              .toList();
          final totalPages =
              int.tryParse((decoded['totalPages'] ?? '0').toString()) ?? 1;
          final totalItems =
              int.tryParse((decoded['totalItems'] ?? '0').toString()) ??
                  items.length;
          return (items, totalPages, totalItems);
        }
      }
    } catch (_) {}
    return (<Medicine>[], 0, 0);
  }

  Future<Medicine?> fetchMedicine(String id) async {
    try {
      final res = await _client.get('/medicines/$id');
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          final medJson = decoded['data'];
          return medJson is Map<String, dynamic> ? Medicine.fromJson(medJson) : null;
        }
      }
    } catch (_) {}
    return null;
  }

  Future<List<Medicine>> fetchRecommended({int limit = 10}) async {
    try {
      final res = await _client.get('/medicines/recommended', params: {
        'limit': '$limit',
      });
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          return (decoded['data'] as List<dynamic>? ?? [])
              .whereType<Map<String, dynamic>>()
              .map(Medicine.fromJson)
              .toList();
        }
      }
    } catch (_) {}
    return [];
  }
}
