import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/providers/profile_provider.dart';
import '../../../../core/models/payment_method.dart';
import '../../../../core/widgets/medicine_card.dart';
import '../../../../core/widgets/primary_button.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Your Cart')),
      body: cart.items.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  (item.medicine.imageUrl != null &&
                                          item.medicine.imageUrl!
                                              .trim()
                                              .isNotEmpty)
                                      ? item.medicine.imageUrl!.trim()
                                      : kDefaultMedicineImage,
                                  width: 48,
                                  height: 48,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      width: 48,
                                      height: 48,
                                      color: theme.colorScheme.primary
                                          .withValues(alpha: 0.06),
                                      alignment: Alignment.center,
                                      child: Icon(
                                        Icons.medication_rounded,
                                        color: theme.colorScheme.primary
                                            .withValues(alpha: 0.7),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.medicine.name,
                                      style: theme.textTheme.titleSmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if ((item.medicine.manufacturer ?? '')
                                        .isNotEmpty) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        item.medicine.manufacturer!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style:
                                            theme.textTheme.bodySmall?.copyWith(
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 4),
                                    Text(
                                      'Qty: ${item.quantity} • \$ ${item.medicine.price.toStringAsFixed(0)}',
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(
                                          Icons.remove_circle_outline,
                                        ),
                                        onPressed: () {
                                          cart.decrement(item.medicine);
                                        },
                                      ),
                                      Text(
                                        item.quantity.toString(),
                                        style: theme.textTheme.titleMedium,
                                      ),
                                      IconButton(
                                        icon:
                                            const Icon(Icons.add_circle_outline),
                                        onPressed: () {
                                          cart.increment(item.medicine);
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '\$ ${item.lineTotal.toStringAsFixed(0)}',
                                    style:
                                        theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total', style: theme.textTheme.titleMedium),
                          Text(
                            '\$ ${cart.totalPrice.toStringAsFixed(0)}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      PrimaryButton(
                        label: 'Checkout',
                        onPressed: () => _handleCheckout(context),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Future<void> _showPaymentSheet(
    BuildContext context,
    ProfileProvider profileProvider,
    String initialName,
  ) async {
    final nameController = TextEditingController(text: initialName);
    final cardController = TextEditingController();
    final expiryController = TextEditingController();
    final cvvController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            ),
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Add Payment Method',
                          style: Theme.of(ctx)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: nameController,
                      label: 'Cardholder name',
                      hint: 'Name on card',
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: cardController,
                      label: 'Card number',
                      hint: '**** **** **** 1234',
                      keyboard: TextInputType.number,
                      onChanged: (v) {
                        var digits = v.replaceAll(RegExp(r'[^0-9]'), '');
                        if (digits.length > 16) {
                          digits = digits.substring(0, 16);
                        }
                        final buf = StringBuffer();
                        for (int i = 0; i < digits.length; i++) {
                          buf.write(digits[i]);
                          if ((i + 1) % 4 == 0 && i + 1 != digits.length) {
                            buf.write(' ');
                          }
                        }
                        final formatted = buf.toString();
                        if (formatted != cardController.text) {
                          final sel = cardController.selection.baseOffset +
                              (formatted.length - v.length);
                          cardController.value = TextEditingValue(
                            text: formatted,
                            selection: TextSelection.collapsed(
                              offset: sel.clamp(0, formatted.length),
                            ),
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _AddressField(
                            controller: expiryController,
                            label: 'Expiry (MM/YY)',
                            hint: '08/27',
                            keyboard: TextInputType.datetime,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _AddressField(
                            controller: cvvController,
                            label: 'CVV',
                            hint: '123',
                            keyboard: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: 'Save payment',
                      onPressed: () async {
                        if (!(formKey.currentState?.validate() ?? false)) {
                          return;
                        }
                        final email = context.read<AuthProvider>().currentEmail;
                        if (email == null) return;
                        final cardNumber = cardController.text.trim();
                        final digits = cardNumber.replaceAll(' ', '');
                        if (digits.length != 16) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Enter a 16-digit card number'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                          return;
                        }
                        final brand = cardNumber.startsWith('4')
                            ? 'Visa'
                            : cardNumber.startsWith('5')
                                ? 'Mastercard'
                                : 'Card';
                        final exp = expiryController.text.trim();
                        final parts = exp.split('/');
                        final month = parts.isNotEmpty ? parts[0].padLeft(2, '0') : '';
                        final year = parts.length > 1 ? parts[1].padLeft(2, '0') : '';
                        final now = DateTime.now();
                        final monthInt = int.tryParse(month) ?? 0;
                        final yearInt = int.tryParse(year.length == 2 ? '20$year' : year) ?? 0;
                        if (monthInt < 1 || monthInt > 12) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Enter a valid expiry month'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                          return;
                        }
                        if (yearInt < now.year || yearInt > now.year + 15) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Enter a valid expiry year'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                          return;
                        }
                        if (yearInt == now.year && monthInt < now.month) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Card is expired'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                          return;
                        }
                        final saved = await profileProvider.savePaymentMethodRemote(
                          email: email,
                          cardHolderName: nameController.text.trim(),
                          cardNumber: cardNumber,
                          expiry: '$month/$year',
                          brand: brand,
                        );
                        if (!saved) {
                          profileProvider.setPaymentMethod(
                            email: email,
                            method: PaymentMethod(
                              cardHolderName: nameController.text.trim(),
                              cardNumber: cardNumber,
                              expiryMonth: month,
                              expiryYear: year,
                              brand: brand,
                            ),
                          );
                        }
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleCheckout(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final profileProvider = context.read<ProfileProvider>();
    final email = auth.currentEmail;
    if (email == null) return;

    profileProvider.updateToken(auth.token);
    await profileProvider.fetchProfile();
    // Abort if widget was disposed while awaiting profile
    if (!context.mounted) return;

    final profile = profileProvider.profileFor(email);
    if (profile.address.trim().isEmpty) {
      await _showAddressSheet(context, profileProvider, profile.name);
      // Guard against disposed context after sheet
      if (!context.mounted) return;
    }

    final updatedProfile = profileProvider.profileFor(email);
    if (updatedProfile.address.trim().isEmpty) return;

    if (updatedProfile.defaultPaymentMethod == null) {
      await _showPaymentSheet(context, profileProvider, updatedProfile.name);
      // Guard against disposed context after sheet
      if (!context.mounted) return;
    }

    final finalProfile = profileProvider.profileFor(email);
    if (finalProfile.address.trim().isEmpty ||
        finalProfile.defaultPaymentMethod == null) {
      return;
    }

    if (!context.mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
    );
  }

  Future<void> _showAddressSheet(
    BuildContext context,
    ProfileProvider profileProvider,
    String initialName,
  ) async {
    final nameController = TextEditingController(text: initialName);
    final phoneController = TextEditingController();
    final line1Controller = TextEditingController();
    final line2Controller = TextEditingController();
    final cityController = TextEditingController();
    final zipController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 16,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            ),
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Add Delivery Address',
                          style: Theme.of(ctx)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: nameController,
                      label: 'Full Name',
                      hint: 'John Doe',
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: phoneController,
                      label: 'Phone Number',
                      hint: '+1 222 333 4444',
                      keyboard: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: line1Controller,
                      label: 'Address Line 1',
                      hint: '123 Health Street',
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: line2Controller,
                      label: 'Address Line 2 (optional)',
                      hint: 'Apartment, suite, etc.',
                      requiredField: false,
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: cityController,
                      label: 'City',
                      hint: 'Wellness City',
                    ),
                    const SizedBox(height: 12),
                    _AddressField(
                      controller: zipController,
                      label: 'Zip / Postal Code',
                      hint: '12345',
                      keyboard: TextInputType.number,
                    ),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: 'Save',
                      onPressed: () async {
                        if (!(formKey.currentState?.validate() ?? false)) {
                          return;
                        }
                        final email = context.read<AuthProvider>().currentEmail;
                        if (email == null) return;
                        await profileProvider.saveAddressRemote(
                          email: email,
                          fullName: nameController.text.trim(),
                          phone: phoneController.text.trim(),
                          line1: line1Controller.text.trim(),
                          line2: line2Controller.text.trim(),
                          city: cityController.text.trim(),
                          zip: zipController.text.trim(),
                        );
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _AddressField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final bool requiredField;
  final TextInputType keyboard;
  final void Function(String)? onChanged;

  const _AddressField({
    required this.controller,
    required this.label,
    required this.hint,
    this.requiredField = true,
    this.keyboard = TextInputType.text,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        filled: true,
      ),
      validator: (value) {
        if (!requiredField) return null;
        if (value == null || value.trim().isEmpty) {
          return 'Required field';
        }
        return null;
      },
    );
  }
}
