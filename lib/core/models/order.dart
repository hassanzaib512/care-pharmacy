import 'medicine.dart';

class OrderItem {
  final Medicine medicine;
  final int quantity;

  const OrderItem({required this.medicine, required this.quantity});

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final medRaw = json['medicine'];
    final med = medRaw is Map<String, dynamic>
        ? Medicine.fromJson(medRaw)
        : medRaw is String
            ? Medicine(
                id: medRaw,
                name: 'Unknown',
                category: '',
                description: '',
                usage: '',
                price: 0,
                isTrending: false,
                seasons: const [],
                ingredients: const [],
                warnings: const [],
                primaryConditions: const [],
                imageUrls: const [],
                reviews: const [],
                rating: 0,
                ratingCount: 0,
              )
            : Medicine(
                id: '',
                name: 'Unknown',
                category: '',
                description: '',
                usage: '',
                price: 0,
                isTrending: false,
                seasons: const [],
                ingredients: const [],
                warnings: const [],
                primaryConditions: const [],
                imageUrls: const [],
                reviews: const [],
                rating: 0,
                ratingCount: 0,
              );
    return OrderItem(
      medicine: med,
      quantity: json['quantity'] ?? 1,
    );
  }
}

class Order {
  final String id;
  final DateTime date;
  final double total;
  final String status;
  final String deliveryStatus;
  final List<OrderItem> items;

  const Order({
    required this.id,
    required this.date,
    required this.total,
    required this.status,
    required this.deliveryStatus,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final items = (json['items'] as List<dynamic>? ?? [])
        .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return Order(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      date: DateTime.tryParse(json['createdAt'] ?? '') ??
          DateTime.tryParse(json['date'] ?? '') ??
          DateTime.now(),
      total: (json['totalAmount'] is num)
          ? (json['totalAmount'] as num).toDouble()
          : (json['total'] is num)
              ? (json['total'] as num).toDouble()
              : 0,
      status: json['status'] ?? 'paid',
      deliveryStatus: json['deliveryStatus']?.toString() ?? '',
      items: items,
    );
  }
}
