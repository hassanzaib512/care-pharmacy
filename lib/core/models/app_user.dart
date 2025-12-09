import 'payment_method.dart';

class AppUser {
  final String id;
  final String email;
  final String name;
  final String phone;
  final String address;
  final String avatarUrl;
  final double totalSpend;
  final PaymentMethod? defaultPaymentMethod;

  const AppUser({
    required this.email,
    this.id = '',
    this.name = '',
    this.phone = '',
    this.address = '',
    this.avatarUrl = '',
    this.totalSpend = 0,
    this.defaultPaymentMethod,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      phone: json['address'] != null ? (json['address']['phone'] ?? '') : (json['phone'] ?? ''),
      address: json['address'] != null
          ? [
              json['address']['line1'] ?? '',
              json['address']['line2'] ?? '',
              json['address']['city'] ?? '',
              json['address']['zip'] ?? '',
            ].where((e) => e != null && e.toString().isNotEmpty).join(', ')
          : (json['address'] ?? ''),
      avatarUrl: json['avatarUrl']?.toString() ?? '',
      totalSpend: (json['totalSpend'] is num)
          ? (json['totalSpend'] as num).toDouble()
          : 0,
      defaultPaymentMethod: json['paymentMethod'] != null
          ? PaymentMethod(
              cardHolderName: json['paymentMethod']['cardHolderName'] ?? '',
              cardNumber: json['paymentMethod']['maskedCardNumber'] ?? '',
              expiryMonth: '',
              expiryYear: '',
              brand: json['paymentMethod']['brand'],
            )
          : null,
    );
  }

  AppUser copyWith({
    String? id,
    String? name,
    String? phone,
    String? address,
    String? avatarUrl,
    double? totalSpend,
    PaymentMethod? defaultPaymentMethod,
  }) {
    return AppUser(
      id: id ?? this.id,
      email: email,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      totalSpend: totalSpend ?? this.totalSpend,
      defaultPaymentMethod: defaultPaymentMethod ?? this.defaultPaymentMethod,
    );
  }
}
