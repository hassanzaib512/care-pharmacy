import 'package:flutter/material.dart';

import '../models/medicine.dart';
import '../services/api_client.dart';
import '../services/medicine_api_service.dart';

class MedicineProvider extends ChangeNotifier {
  MedicineProvider() {
    _api = MedicineApiService(_client);
  }

  final ApiClient _client = ApiClient();
  late final MedicineApiService _api;

  List<Medicine> _all = [];
  List<Medicine> _trending = [];
  List<Medicine> _popular = [];
  List<Medicine> _recommended = [];
  bool _loading = false;
  Season? _remoteSeason;

  List<Medicine> get all => _all;
  List<Medicine> get trending => _trending;
  List<Medicine> get popular => _popular;
  List<Medicine> get recommended => _recommended;
  bool get loading => _loading;
  Season? get remoteSeason => _remoteSeason;

  void updateToken(String? token) {
    _client.updateToken(token);
  }

  Future<void> loadAll({
    String? search,
    String? category,
    String? composition,
    String? tag,
  }) async {
    _loading = true;
    notifyListeners();
    try {
      final (items, _, _) = await _api.fetchMedicines(
        search: search,
        category: category,
        composition: composition,
        tag: tag,
        page: 1,
        limit: 40,
      );
      _all = items;
    } catch (_) {} finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadSeason() async {
    try {
      final season = await _api.fetchSeason();
      if (season != null) {
        switch (season.toLowerCase()) {
          case 'spring':
            _remoteSeason = Season.spring;
            break;
          case 'summer':
            _remoteSeason = Season.summer;
            break;
          case 'autumn':
          case 'fall':
            _remoteSeason = Season.autumn;
            break;
          case 'rainy':
            _remoteSeason = Season.winter; // map rainy to winter styling for now
            break;
          default:
            _remoteSeason = Season.winter;
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> loadTrending() async {
    try {
      final (items, _, _) = await _api.fetchMedicines(tag: 'trending', limit: 12);
      if (items.isNotEmpty) {
        _trending = items;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> loadPopular() async {
    try {
      final (items, _, _) = await _api.fetchMedicines(tag: 'popular', limit: 12);
      if (items.isNotEmpty) {
        _popular = items;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> loadRecommended() async {
    try {
      final items = await _api.fetchRecommended(limit: 12);
      _recommended = items;
      notifyListeners();
    } catch (_) {}
  }

  Medicine? findById(String id) {
    try {
      return _all.firstWhere((m) => m.id == id);
    } catch (_) {
      return null;
    }
  }
}
