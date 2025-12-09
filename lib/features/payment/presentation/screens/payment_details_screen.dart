import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/payment_method.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/profile_provider.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/utils/snackbar.dart';

class PaymentDetailsScreen extends StatefulWidget {
  const PaymentDetailsScreen({super.key});

  @override
  State<PaymentDetailsScreen> createState() => _PaymentDetailsScreenState();
}

class _PaymentDetailsScreenState extends State<PaymentDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cardHolderController = TextEditingController();
  final _cardNumberController = TextEditingController();
  final _expiryController = TextEditingController();
  String? _brand;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    if (auth.currentEmail != null) {
      final profile = context.read<ProfileProvider>().profileFor(
        auth.currentEmail!,
      );
      final payment = profile.defaultPaymentMethod;
      if (payment != null) {
        _cardHolderController.text = payment.cardHolderName;
        _cardNumberController.text = payment.cardNumber;
        _expiryController.text = '${payment.expiryMonth.padLeft(2, '0')}/${payment.expiryYear.substring(payment.expiryYear.length - 2)}';
        _brand = payment.brand;
      }
    }
  }

  @override
  void dispose() {
    _cardHolderController.dispose();
    _cardNumberController.dispose();
    _expiryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Payment Details')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Securely save your preferred card to speed up future checkouts.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 20),
                AppTextField(
                  controller: _cardHolderController,
                  label: 'Cardholder name',
                  hint: 'As printed on card',
                  icon: Icons.badge_outlined,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                AppTextField(
                  controller: _cardNumberController,
                  label: 'Card number',
                  hint: '16-digit number',
                  icon: Icons.credit_card,
                  keyboardType: TextInputType.number,
                  onChanged: _formatCardNumber,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Required';
                    }
                    final digits = value.replaceAll(' ', '');
                    if (digits.length != 16) {
                      return 'Enter 16 digits';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                AppTextField(
                  controller: _expiryController,
                  label: 'Expiry',
                  hint: 'MM/YY',
                  icon: Icons.calendar_today_outlined,
                  keyboardType: TextInputType.number,
                  onChanged: _formatExpiry,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Required';
                    }
                    final parts = _parseExpiry(value);
                    if (parts == null) return 'Use MM/YY';
                    final now = DateTime.now();
                    final isPast = parts['year']! < now.year ||
                        (parts['year'] == now.year && parts['month']! < now.month);
                    if (isPast) return 'Card expired';
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Brand',
                    prefixIcon: Icon(Icons.payment),
                  ),
                  initialValue: const ['Visa', 'Mastercard', 'Amex', 'Other']
                          .contains(_brand)
                      ? _brand
                      : null,
                  items: const [
                    DropdownMenuItem(value: 'Visa', child: Text('Visa')),
                    DropdownMenuItem(
                      value: 'Mastercard',
                      child: Text('Mastercard'),
                    ),
                    DropdownMenuItem(value: 'Amex', child: Text('Amex')),
                    DropdownMenuItem(value: 'Other', child: Text('Other')),
                  ],
                  onChanged: (val) => setState(() => _brand = val),
                  validator: (val) =>
                      val == null ? 'Select a brand' : null,
                ),
                const SizedBox(height: 22),
                PrimaryButton(
                  label: 'Save Payment Method',
                  onPressed: _savePayment,
                  icon: Icons.check_circle_outline,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _savePayment() {
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) return;
    final auth = context.read<AuthProvider>();
    if (auth.currentEmail == null) return;

    final expiry = _parseExpiry(_expiryController.text)!;
    final method = PaymentMethod(
      cardHolderName: _cardHolderController.text.trim(),
      cardNumber: _cardNumberController.text.replaceAll(' ', ''),
      expiryMonth: expiry['month']!.toString().padLeft(2, '0'),
      expiryYear: expiry['year']!.toString(),
      brand: _brand,
    );

    context.read<ProfileProvider>().setPaymentMethod(
      email: auth.currentEmail!,
      method: method,
    );

    Navigator.pop(context);
    showCartAwareSnackBar(
      context,
      message: 'Payment method updated',
    );
  }

  void _formatCardNumber(String value) {
    var digitsOnly = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.length > 16) {
      digitsOnly = digitsOnly.substring(0, 16);
    }
    final buffer = StringBuffer();
    for (int i = 0; i < digitsOnly.length; i++) {
      buffer.write(digitsOnly[i]);
      if ((i + 1) % 4 == 0 && i + 1 != digitsOnly.length) {
        buffer.write(' ');
      }
    }
    final formatted = buffer.toString();
    if (formatted != _cardNumberController.text) {
      final selectionIndex =
          _cardNumberController.selection.baseOffset + (formatted.length - value.length);
      _cardNumberController.value = TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(
          offset: selectionIndex.clamp(0, formatted.length),
        ),
      );
    }
  }

  void _formatExpiry(String value) {
    var digits = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 4) digits = digits.substring(0, 4);

    String formatted;
    if (digits.length <= 2) {
      formatted = digits;
    } else {
      formatted = '${digits.substring(0, 2)}/${digits.substring(2)}';
    }

    _expiryController.value = TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(
        offset: formatted.length,
      ),
    );
  }

  Map<String, int>? _parseExpiry(String value) {
    final cleaned = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleaned.length < 3) return null;
    final month = int.tryParse(cleaned.substring(0, 2));
    final yearPart = cleaned.substring(2);
    final fullYear = int.tryParse(yearPart);
    if (month == null || month < 1 || month > 12 || fullYear == null) return null;
    // Normalize YY to YYYY
    final normalizedYear = fullYear < 100 ? 2000 + fullYear : fullYear;
    if (normalizedYear > DateTime.now().year + 15) return null;
    return {'month': month, 'year': normalizedYear};
  }
}
