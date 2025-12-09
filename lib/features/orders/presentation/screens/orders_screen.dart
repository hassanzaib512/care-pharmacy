import 'package:flutter/material.dart';

import 'package:provider/provider.dart';

import '../../../../core/models/order.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/order_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../common/presentation/widgets/app_drawer.dart';
import '../../../../core/theme/app_theme.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  bool _init = false;
  String _statusFilter = 'all';

  List<Order> _filtered(List<Order> orders) {
    if (_statusFilter == 'all') return orders;
    final target = _statusFilter.toLowerCase();
    return orders
        .where((o) => (o.status.toLowerCase().contains(target) || o.deliveryStatus.toLowerCase().contains(target)))
        .toList();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_init) return;
    _init = true;
    // Capture providers synchronously to avoid context after async gaps
    final auth = context.read<AuthProvider>();
    final orders = context.read<OrderProvider>();
    Future.microtask(() async {
      orders.updateToken(auth.token);
      await orders.fetchOrders();
      // Stop if the widget was disposed during async load
      if (!mounted) return;
    });
  }

  @override
  Widget build(BuildContext context) {
    final orders = context.watch<OrderProvider>();
    final data = _filtered(orders.orders);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => _statusFilter = value),
            initialValue: _statusFilter,
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'all', child: Text('All')),
              PopupMenuItem(value: 'pending', child: Text('Pending')),
              PopupMenuItem(value: 'paid', child: Text('Paid')),
              PopupMenuItem(value: 'processing', child: Text('Processing')),
              PopupMenuItem(value: 'in progress', child: Text('In Progress')),
              PopupMenuItem(value: 'delivered', child: Text('Delivered')),
              PopupMenuItem(value: 'completed', child: Text('Completed')),
              PopupMenuItem(value: 'cancel', child: Text('Cancelled')),
            ],
            icon: const Icon(Icons.filter_alt_outlined),
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: AppRoutes.orders),
      body: orders.loading
          ? const Center(child: CircularProgressIndicator())
          : data.isEmpty
              ? const Center(child: Text('No orders yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: data.length,
                  itemBuilder: (context, index) {
                    final order = data[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _OrderCard(
                        order: order,
                        onTap: () {
                          Navigator.pushNamed(
                            context,
                            AppRoutes.orderDetail,
                            arguments: OrderDetailArgs(order: order),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;

  const _OrderCard({required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(Icons.receipt_long_rounded,
                            color: AppTheme.primaryColor, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '#${order.id}',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Placed on ${order.date.month}/${order.date.day}/${order.date.year}',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: Colors.grey[700]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${order.items.length} items',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  Text(
                    '\$${order.total.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primaryColor,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
              if (order.deliveryStatus.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Delivery: ${order.deliveryStatus}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[700],
                        fontWeight: FontWeight.w500,
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

class _OrderStatusChip extends StatelessWidget {
  final String status;

  const _OrderStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lower = status.toLowerCase();
    Color bg = theme.colorScheme.surfaceContainerHighest;
    Color textColor = theme.colorScheme.onSurfaceVariant;
    if (lower.contains('cancel')) {
      bg = const Color(0xFFFFE9E9);
      textColor = const Color(0xFFC62828);
    } else if (lower.contains('deliver') || lower.contains('complete')) {
      bg = const Color(0xFFE6F8EC);
      textColor = const Color(0xFF1B8A4B);
    } else if (lower.contains('progress') || lower.contains('process')) {
      bg = const Color(0xFFFFF3E5);
      textColor = const Color(0xFFCC6A1A);
    } else if (lower.contains('paid') || lower.contains('pending')) {
      bg = const Color(0xFFE8F1FF);
      textColor = const Color(0xFF1A73E8);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: theme.textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

class OrderDetailArgs {
  final Order order;

  OrderDetailArgs({required this.order});
}
