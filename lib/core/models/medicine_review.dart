class MedicineReview {
  final String userName;
  final String userId;
  final String userEmail;
  final String id;
  final double rating;
  final String comment;
  final DateTime date;

  const MedicineReview({
    required this.id,
    required this.userId,
    required this.userEmail,
    required this.userName,
    required this.rating,
    required this.comment,
    required this.date,
  });

  factory MedicineReview.fromJson(Map<String, dynamic> json) {
    final user =
        json['user'] is Map ? json['user'] as Map<String, dynamic> : null;
    final userNameRaw = user?['name']?.toString() ?? '';
    return MedicineReview(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      userId: (user?['_id'] ?? user?['id'] ?? '').toString(),
      userEmail: (user?['email'] ?? '').toString(),
      userName: userNameRaw.isNotEmpty ? userNameRaw : 'Guest',
      rating:
          (json['rating'] is num) ? (json['rating'] as num).toDouble() : 0,
      comment: json['comment'] ?? '',
      date: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
