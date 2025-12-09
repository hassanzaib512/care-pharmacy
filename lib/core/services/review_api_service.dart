import 'dart:convert';

import '../models/medicine_review.dart';
import 'api_client.dart';

class ReviewApiService {
  ReviewApiService(this._client);

  final ApiClient _client;

  dynamic _decode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return body;
    }
  }

  Future<(List<MedicineReview>, int, int, double, int)> fetchReviews(
    String medicineId, {
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final res = await _client.get(
        '/medicines/$medicineId/reviews',
        params: {'page': '$page', 'limit': '$limit'},
      );
      if (res.statusCode == 200) {
        final decoded = _decode(res.body);
        if (decoded is Map<String, dynamic>) {
          final items = (decoded['data'] as List<dynamic>? ?? [])
              .whereType<Map<String, dynamic>>()
              .map(MedicineReview.fromJson)
              .toList();
          final meta = decoded['meta'] as Map<String, dynamic>? ?? {};
          final avg = meta['averageRating'];
          final cnt = meta['reviewCount'];
          return (
            items,
            int.tryParse((decoded['totalPages'] ?? '0').toString()) ?? 1,
            int.tryParse((decoded['totalItems'] ?? '0').toString()) ?? items.length,
            avg is num ? avg.toDouble() : 0.0,
            cnt is num ? cnt.toInt() : items.length,
          );
        }
      }
    } catch (_) {}
    return (<MedicineReview>[], 0, 0, 0.0, 0);
  }

  Future<bool> addReview({
    required String orderId,
    required String medicineId,
    required double rating,
    String? comment,
  }) async {
    final normalized = rating.isNaN ? 1 : rating.round();
    final safeRating = normalized.clamp(1, 5);
    try {
      final res = await _client.post(
        '/reviews',
        body: {
          'orderId': orderId,
          'medicineId': medicineId,
          'rating': safeRating,
          'comment': comment ?? '',
        },
      );
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateReview({
    required String reviewId,
    required double rating,
    String? comment,
  }) async {
    final normalized = rating.isNaN ? 1 : rating.round();
    final safeRating = normalized.clamp(1, 5);
    try {
      final res = await _client.put(
        '/reviews/$reviewId',
        body: {
          'rating': safeRating,
          'comment': comment ?? '',
        },
      );
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}
