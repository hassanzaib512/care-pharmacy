import 'medicine_review.dart';

enum Season { winter, spring, summer, autumn }

class Medicine {
  final String id;
  final String name;
  final String category;
  final String description;
  final String? usage;
  final double price;
  final bool isTrending;
  final List<Season> seasons;
  final List<String> ingredients;
  final List<String> warnings;
  final List<String> primaryConditions;
  final String? imageUrl;
  final List<String> imageUrls;
  final String? manufacturer;
  final double rating;
  final int ratingCount;
  final List<MedicineReview> reviews;

  const Medicine({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    this.usage,
    required this.price,
    required this.isTrending,
    required this.seasons,
    required this.ingredients,
    this.warnings = const [],
    this.primaryConditions = const [],
    this.imageUrl,
    this.imageUrls = const [],
    this.manufacturer,
    this.rating = 4.5,
    this.ratingCount = 120,
    this.reviews = const [],
  });

  factory Medicine.fromJson(Map<String, dynamic> json) {
    final imgs = (json['imageUrls'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();
    if (imgs.isEmpty && (json['imageUrl'] ?? '').toString().isNotEmpty) {
      imgs.add(json['imageUrl'].toString());
    }
    final revs = (json['reviews'] as List<dynamic>? ?? [])
        .map((e) => MedicineReview.fromJson(e as Map<String, dynamic>))
        .toList();
    final tags = (json['tags'] as List<dynamic>? ?? []).map((e) => e.toString().toLowerCase()).toList();
    final seasonsFromTags = <Season>[];
    if (tags.contains('winter')) seasonsFromTags.add(Season.winter);
    if (tags.contains('spring')) seasonsFromTags.add(Season.spring);
    if (tags.contains('summer')) seasonsFromTags.add(Season.summer);
    if (tags.contains('autumn') || tags.contains('fall')) {
      seasonsFromTags.add(Season.autumn);
    }
    return Medicine(
      id: json['_id']?.toString() ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      description: json['description'] ?? '',
      usage: json['usage'],
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : 0,
      isTrending: tags.contains('trending') || tags.contains('popular'),
      seasons: seasonsFromTags,
      ingredients: (json['composition'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      warnings: (json['warnings'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      primaryConditions: (json['primaryConditions'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      imageUrl: imgs.isNotEmpty ? imgs.first : null,
      imageUrls: imgs,
      manufacturer: json['manufacturer'],
      rating: (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      ratingCount: json['reviewsCount'] ?? 0,
      reviews: revs,
    );
  }
}
