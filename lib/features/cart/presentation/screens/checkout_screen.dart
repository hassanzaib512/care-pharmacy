import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/cart_provider.dart';
import '../../../../core/providers/order_provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/utils/snackbar.dart';

class CheckoutScreen extends StatelessWidget {
  const CheckoutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final theme = Theme.of(context);
    final orders = context.watch<OrderProvider>();
    final auth = context.read<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order Summary', style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Items: ${cart.totalItems}'),
            Text('Total: \$ ${cart.totalPrice.toStringAsFixed(0)}'),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.only(top: 8),
                itemCount: cart.items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = cart.items[index];
                  final medicine = item.medicine;
                  return Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: medicine.imageUrl != null
                            ? Image.network(
                                medicine.imageUrl!,
                                width: 56,
                                height: 56,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    width: 56,
                                    height: 56,
                                    color: theme.colorScheme.primary
                                        .withValues(alpha: 0.06),
                                    alignment: Alignment.center,
                                    child: Icon(
                                      Icons.broken_image_outlined,
                                      color: theme.colorScheme.primary
                                          .withValues(alpha: 0.7),
                                    ),
                                  );
                                },
                              )
                            : Container(
                                width: 56,
                                height: 56,
                                color: theme.colorScheme.primary.withValues(alpha: 
                                  0.08,
                                ),
                                child: Icon(
                                  Icons.medication_rounded,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              medicine.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              'Qty: ${item.quantity}',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '\$ ${item.lineTotal.toStringAsFixed(0)}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Text('Delivery', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Your saved address will be used for delivery.\n(This is a demo screen, no real payment.)',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            _PlaceOrderButton(),
          ],
        ),
      ),
    );
  }
}

class _PlaceOrderButton extends StatefulWidget {
  @override
  State<_PlaceOrderButton> createState() => _PlaceOrderButtonState();
}

class _PlaceOrderButtonState extends State<_PlaceOrderButton> {
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final orders = context.watch<OrderProvider>();
    final cart = context.watch<CartProvider>();
    final auth = context.watch<AuthProvider>();
    final navigator = Navigator.of(context, rootNavigator: true);

    return PrimaryButton(
      label: 'Place Order',
      isLoading: _submitting || orders.loading,
      onPressed: _submitting
          ? null
          : () async {
              final items = cart.items
                  .where((e) => e.medicine.id.isNotEmpty)
                  .map((e) => {
                        'medicine': e.medicine.id,
                        'quantity': e.quantity,
                      })
                  .toList();
              if (items.isEmpty) {
                showCartAwareSnackBar(
                  context,
                  message: 'Cannot place order: missing medicine IDs.',
                  isError: true,
                );
                return;
              }
              setState(() => _submitting = true);
              orders.updateToken(auth.token);
              final result = await orders.placeOrder(items);
              if (!mounted) return;
              showCartAwareSnackBar(
                context,
                message: result.message,
                isError: !result.success,
                actionLabel: result.success ? 'View' : null,
                onAction: result.success
                    ? () {
                        navigator.popUntil((route) => route.isFirst);
                        navigator.pushNamed(AppRoutes.orders);
                      }
                    : null,
                duration: const Duration(seconds: 5),
              );
              if (result.success) {
                cart.clear();
                Navigator.of(context).popUntil((route) => route.isFirst);
              }
              if (mounted) setState(() => _submitting = false);
            },
    );
  }
}
