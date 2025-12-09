import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item.dart';
import '../models/medicine.dart';

class CartProvider extends ChangeNotifier {
  final List<CartItem> _items = [];
  bool _isSnackBarVisible = false;
  double _bottomInset = 0;
  List<Map<String, dynamic>> _pending = [];

  CartProvider() {
    _loadFromStorage();
  }

  List<CartItem> get items => List.unmodifiable(_items);

  int get totalItems => _items.fold<int>(0, (sum, item) => sum + item.quantity);

  double get totalPrice =>
      _items.fold<double>(0, (sum, item) => sum + item.lineTotal);

  bool get isSnackBarVisible => _isSnackBarVisible;
  double get bottomInset => _bottomInset;

  void setSnackBarVisible(bool value) {
    if (_isSnackBarVisible == value) return;
    _isSnackBarVisible = value;
    _bottomInset = value ? 56 : 0;
    notifyListeners();
  }

  void addToCart(Medicine medicine) {
    final existing = _items.where(
      (element) => element.medicine.id == medicine.id,
    );
    if (existing.isNotEmpty) {
      existing.first.quantity += 1;
    } else {
      _items.add(CartItem(medicine: medicine));
    }
    notifyListeners();
    _saveToStorage();
  }

  void increment(Medicine medicine) {
    final item = _items.firstWhere(
      (element) => element.medicine.id == medicine.id,
      orElse: () => CartItem(medicine: medicine),
    );
    if (!_items.contains(item)) {
      _items.add(item);
    } else {
      item.quantity += 1;
    }
    notifyListeners();
    _saveToStorage();
  }

  void decrement(Medicine medicine) {
    final index = _items.indexWhere(
      (element) => element.medicine.id == medicine.id,
    );
    if (index == -1) return;
    final item = _items[index];
    item.quantity -= 1;
    if (item.quantity <= 0) {
      _items.removeAt(index);
    }
    notifyListeners();
    _saveToStorage();
  }

  void remove(Medicine medicine) {
    _items.removeWhere((element) => element.medicine.id == medicine.id);
    notifyListeners();
    _saveToStorage();
  }

  void clear() {
    _items.clear();
    _pending.clear();
    notifyListeners();
    _saveToStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('cart_items');
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        _pending = decoded.cast<Map<String, dynamic>>();
      }
    } catch (_) {}
  }

  Future<void> _saveToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final data = _items
        .map((e) => {
              'id': e.medicine.id,
              'qty': e.quantity,
              'price': e.medicine.price,
              'name': e.medicine.name,
              'manufacturer': e.medicine.manufacturer,
              'imageUrl': e.medicine.imageUrl,
            })
        .toList();
    await prefs.setString('cart_items', jsonEncode(data));
  }

  /// Attach pending cart entries to actual medicine objects once medicines are loaded.
  void hydrateFromMedicines(List<Medicine> medicines) {
    if (_pending.isEmpty) return;
    for (final entry in _pending) {
      final id = entry['id']?.toString();
      final qty = entry['qty'] is int
          ? entry['qty'] as int
          : int.tryParse(entry['qty']?.toString() ?? '') ?? 1;
      if (id == null) continue;
      final med = medicines.firstWhere(
        (m) => m.id == id,
        orElse: () => Medicine(
          id: id,
          name: entry['name']?.toString() ?? 'Medicine',
          category: '',
          description: '',
          usage: '',
          price: (entry['price'] is num)
              ? (entry['price'] as num).toDouble()
              : 0,
          isTrending: false,
          seasons: const [],
          ingredients: const [],
          warnings: const [],
          primaryConditions: const [],
          imageUrl: entry['imageUrl']?.toString(),
          imageUrls: const [],
          manufacturer: entry['manufacturer']?.toString(),
          rating: 0,
          ratingCount: 0,
          reviews: const [],
        ),
      );
      final existing = _items
          .cast<CartItem?>()
          .firstWhere((e) => e?.medicine.id == med.id, orElse: () => null);
      if (existing != null) {
        existing.quantity += qty;
      } else {
        _items.add(CartItem(medicine: med, quantity: qty));
      }
    }
    _pending.clear();
    notifyListeners();
    _saveToStorage();
  }
}
