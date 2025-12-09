import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/order.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/order_provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/medicine_card.dart';
import '../../../../core/utils/snackbar.dart';
import '../../../home/presentation/screens/medicine_detail_screen.dart';

class OrderDetailScreen extends StatefulWidget {
  final Order order;

  const OrderDetailScreen({super.key, required this.order});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _loading = false;
  bool _cancelling = false;

  String _placedOn(Order order) =>
      '${order.date.month}/${order.date.day}/${order.date.year}';

  double _subtotal(Order order) =>
      order.items.fold(0, (sum, item) => sum + (item.medicine.price * item.quantity));

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    Future.microtask(_refreshFromApi);
  }

  bool _isCancelable(Order order) {
    final status = order.status.toLowerCase();
    final delivery = order.deliveryStatus.toLowerCase();
    return status == 'pending' ||
        status == 'paid' ||
        status.contains('process') ||
        delivery.contains('progress');
  }

  Future<void> _cancelOrder() async {
    if (_order == null || _cancelling) return;
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Cancel order?'),
            content: const Text(
              'Are you sure you want to cancel this order? This cannot be undone.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Keep order'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Cancel order'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) return;

    setState(() => _cancelling = true);
    final orders = context.read<OrderProvider>();
    final auth = context.read<AuthProvider>();
    final navigator = Navigator.of(context);
    orders.updateToken(auth.token);
    final result = await orders.cancelOrder(_order!.id);
    if (result.success) {
      final updated = await orders.fetchOrder(_order!.id);
      if (!mounted) return;
      if (updated != null) {
        setState(() => _order = updated);
      }
      showCartAwareSnackBar(
        context,
        message: result.message,
      );
      navigator.pop(); // back to orders listing
    } else if (mounted) {
      showCartAwareSnackBar(
        context,
        message: result.message,
        isError: true,
      );
    }
    if (mounted) setState(() => _cancelling = false);
  }

  Future<void> _refreshFromApi() async {
    final orders = context.read<OrderProvider>();
    final auth = context.read<AuthProvider>();
    orders.updateToken(auth.token);
    setState(() => _loading = true);
    final updated = await orders.fetchOrder(widget.order.id);
    if (updated != null && mounted) {
      setState(() => _order = updated);
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final order = _order;

    return Scaffold(
      appBar: AppBar(title: const Text('Order details')),
      body: order == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshFromApi,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_loading)
                      const LinearProgressIndicator(minHeight: 3)
                    else
                      const SizedBox(height: 3),
                    _SummaryCard(
                      order: order,
                      placedOn: _placedOn(order),
                      status: order.status,
                      deliveryStatus: order.deliveryStatus.isNotEmpty
                          ? order.deliveryStatus
                          : order.status,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Items in this order',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _ItemsCard(order: order),
                    const SizedBox(height: 16),
                    Text(
                      'Payment summary',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _PaymentSummary(
                      subtotal: _subtotal(order),
                      total: order.total,
                    ),
                    if (_isCancelable(order)) ...[
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _cancelling ? null : _cancelOrder,
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: _cancelling
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text('Cancel order'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final Order order;
  final String placedOn;
  final String status;
  final String deliveryStatus;

  const _SummaryCard({
    required this.order,
    required this.placedOn,
    required this.status,
    required this.deliveryStatus,
  });

  Color _statusBg(BuildContext context, String value) {
    final lower = value.toLowerCase();
    if (lower.contains('delivered') || lower.contains('completed')) {
      return const Color(0xFFE6F8EC);
    }
    if (lower.contains('progress') || lower.contains('processing')) {
      return const Color(0xFFFFF3E5);
    }
    if (lower.contains('cancel')) {
      return const Color(0xFFFFE9E9);
    }
    return Theme.of(context).colorScheme.surfaceContainerHighest;
  }

  Color _statusText(BuildContext context, String value) {
    final lower = value.toLowerCase();
    if (lower.contains('delivered') || lower.contains('completed')) {
      return const Color(0xFF1B8A4B);
    }
    if (lower.contains('progress') || lower.contains('processing')) {
      return const Color(0xFFCC6A1A);
    }
    if (lower.contains('cancel')) {
      return const Color(0xFFC62828);
    }
    return Theme.of(context).colorScheme.onSurface;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.receipt_long_rounded,
                        size: 18, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      '#${order.id}',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Placed on $placedOn',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            Text(
              '${order.items.length} items',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 10),
            _StatusRow(
              label: 'Payment status',
              value: status,
              bg: _statusBg(context, status),
              textColor: _statusText(context, status),
            ),
            const SizedBox(height: 8),
            _StatusRow(
              label: 'Delivery status',
              value: deliveryStatus.isNotEmpty ? deliveryStatus : status,
              bg: _statusBg(context, deliveryStatus.isNotEmpty ? deliveryStatus : status),
              textColor: _statusText(context, deliveryStatus.isNotEmpty ? deliveryStatus : status),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total',
                  style: theme.textTheme.bodyMedium,
                ),
                Text(
                  '\$ ${order.total.toStringAsFixed(0)}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String value;
  final Color bg;
  final Color textColor;

  const _StatusRow({
    required this.label,
    required this.value,
    required this.bg,
    required this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 8,
                offset: const Offset(0, 3),
              )
            ],
          ),
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textColor,
                ),
          ),
        ),
      ],
    );
  }
}

class _ItemsCard extends StatelessWidget {
  final Order order;

  const _ItemsCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            for (int i = 0; i < order.items.length; i++) ...[
              _OrderItemTile(item: order.items[i]),
              if (i != order.items.length - 1) ...[
                const SizedBox(height: 10),
                Divider(color: Colors.grey.withValues(alpha: 0.2), height: 1),
                const SizedBox(height: 10),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _OrderItemTile extends StatelessWidget {
  final OrderItem item;

  const _OrderItemTile({required this.item});

  String get _fallbackImage =>
      (item.medicine.imageUrl != null && item.medicine.imageUrl!.trim().isNotEmpty)
          ? item.medicine.imageUrl!.trim()
          : kDefaultMedicineImage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => MedicineDetailScreen(medicine: item.medicine),
          ),
        );
      },
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              _fallbackImage,
              width: 52,
              height: 52,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 52,
                  height: 52,
                  color: theme.colorScheme.primary.withValues(alpha: 0.08),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.medication_rounded,
                    color: theme.colorScheme.primary.withValues(alpha: 0.7),
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
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item.medicine.manufacturer ?? item.medicine.category,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey.shade700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Qty: ${item.quantity} • \$ ${item.medicine.price.toStringAsFixed(0)}',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '\$ ${(item.quantity * item.medicine.price).toStringAsFixed(0)}',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentSummary extends StatelessWidget {
  final double subtotal;
  final double total;

  const _PaymentSummary({required this.subtotal, required this.total});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _SummaryRow(
              label: 'Subtotal',
              value: '\$ ${subtotal.toStringAsFixed(0)}',
            ),
            const SizedBox(height: 8),
            _SummaryRow(
              label: 'Delivery',
              value: 'Free',
            ),
            const SizedBox(height: 8),
            Divider(color: Colors.grey.withValues(alpha: 0.2)),
            const SizedBox(height: 8),
            _SummaryRow(
              label: 'Grand Total',
              value: '\$ ${total.toStringAsFixed(0)}',
              isBold: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: Colors.grey.shade700,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            color: isBold ? AppTheme.primaryColor : theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
