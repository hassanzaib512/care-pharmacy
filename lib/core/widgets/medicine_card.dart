import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/medicine.dart';
import '../providers/cart_provider.dart';

const String kDefaultMedicineImage =
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80';

class MedicineCard extends StatelessWidget {
  final Medicine medicine;
  final VoidCallback onTap;
  final VoidCallback onAction;

  const MedicineCard({
    super.key,
    required this.medicine,
    required this.onTap,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final imageUrl =
        (medicine.imageUrl != null && medicine.imageUrl!.trim().isNotEmpty)
        ? medicine.imageUrl!.trim()
        : kDefaultMedicineImage;

    return SizedBox(
      width: 190,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 2,
          margin: const EdgeInsets.symmetric(vertical: 6),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          height: 85,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              height: 85,
                              width: double.infinity,
                              color: theme.colorScheme.primary.withValues(
                                alpha: 0.06,
                              ),
                              alignment: Alignment.center,
                              child: Icon(
                                Icons.medication_rounded,
                                color: theme.colorScheme.primary.withValues(
                                  alpha: 0.7,
                                ),
                                size: 20,
                              ),
                            );
                          },
                        )
                      : Container(
                          height: 85,
                          width: double.infinity,
                          color: theme.colorScheme.primary.withValues(
                            alpha: 0.06,
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            Icons.medication_rounded,
                            color: theme.colorScheme.primary.withValues(
                              alpha: 0.7,
                            ),
                            size: 20,
                          ),
                        ),
                ),
                const SizedBox(height: 6),
                Text(
                  medicine.name,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (medicine.manufacturer != null &&
                    medicine.manufacturer!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    medicine.manufacturer!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.textTheme.bodySmall?.color?.withValues(
                        alpha: 0.7,
                      ),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 5),
                Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 3),
                    Text(
                      medicine.rating.toStringAsFixed(1),
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${medicine.ratingCount})',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.textTheme.bodySmall?.color?.withValues(
                          alpha: 0.6,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '\$ ${medicine.price.toStringAsFixed(0)}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        final cart = context.read<CartProvider>();
                        cart.addToCart(medicine);
                      },
                      icon: const Icon(
                        Icons.add_shopping_cart_outlined,
                        size: 20,
                      ),
                      tooltip: 'Add to cart',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
