import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/medicine.dart';
import '../../../../core/models/medicine_review.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/providers/order_provider.dart';
import '../../../../core/services/api_client.dart';
import '../../../../core/services/review_api_service.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/cart_bubble_fab.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../cart/presentation/screens/cart_screen.dart';

class MedicineDetailScreen extends StatefulWidget {
  final Medicine medicine;

  const MedicineDetailScreen({super.key, required this.medicine});

  @override
  State<MedicineDetailScreen> createState() => _MedicineDetailScreenState();
}

class _MedicineDetailScreenState extends State<MedicineDetailScreen> {
  late final PageController _pageController;
  int _currentImageIndex = 0;
  late final List<String> _images;
  static const _autoScrollDelay = Duration(seconds: 3);
  late List<MedicineReview> _reviews;
  late final ApiClient _client;
  late final ReviewApiService _reviewApi;
  bool _loadingReviews = false;
  Timer? _autoTimer;

  List<String> get _galleryImages {
    final urls = <String>[];
    if (widget.medicine.imageUrl != null &&
        widget.medicine.imageUrl!.trim().isNotEmpty) {
      urls.add(widget.medicine.imageUrl!.trim());
    }
    for (final img in widget.medicine.imageUrls) {
      if (img.trim().isNotEmpty) {
        urls.add(img.trim());
      }
    }
    if (urls.isEmpty) {
      urls.add(
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      );
    }
    // If there's only one image, duplicate it to allow auto-scroll feel
    if (urls.length == 1) {
      urls.addAll(urls);
    }
    return urls;
  }

  @override
  void initState() {
    super.initState();
    _images = _galleryImages;
    _pageController = PageController();
    _currentImageIndex = 0;
    _reviews = List<MedicineReview>.from(widget.medicine.reviews);
    _client = ApiClient();
    _reviewApi = ReviewApiService(_client);
    Future.microtask(_loadReviews);
    if (_images.length > 1) {
      _autoTimer = Timer.periodic(_autoScrollDelay, (timer) {
        if (!mounted) return;
        final nextIndex = (_currentImageIndex + 1) % _images.length;
        _pageController.animateToPage(
          nextIndex,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOut,
        );
      });
    }
  }

  @override
  void dispose() {
    _autoTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  bool _userCanReview() {
    final orders = context.read<OrderProvider>().orders;
    return orders.any((order) {
      final status = order.status.toLowerCase();
      final isCompleted = status.contains('delivered') || status.contains('completed');
      if (!isCompleted) return false;
      return order.items.any((item) => item.medicine.id == widget.medicine.id);
    });
  }

  Widget _buildReviewAction(ThemeData theme) {
    final canReview = _userCanReview();
    if (canReview) {
      return OutlinedButton.icon(
        onPressed: () => _openAddReviewSheet(theme),
        icon: const Icon(Icons.rate_review_outlined),
        label: const Text('Add review'),
      );
    }
    return Text(
      'You can add a review after your order with this medicine is delivered.',
      style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
    );
  }

  Future<void> _openAddReviewSheet(ThemeData theme) async {
    double tempRating = 4;
    final commentController = TextEditingController();
    final navigator = Navigator.of(context);
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Add review',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Rating', style: theme.textTheme.bodyMedium),
                  Slider(
                    value: tempRating,
                    min: 1,
                    max: 5,
                    divisions: 8,
                    label: tempRating.toStringAsFixed(1),
                    onChanged: (val) {
                      setModalState(() {
                        tempRating = val;
                      });
                    },
                  ),
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Comment',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      // Capture navigator before async gap
                      await _reviewApi.addReview(
                        medicineId: widget.medicine.id,
                        rating: tempRating,
                        comment: commentController.text.trim(),
                      );
                      if (!mounted) return;
                      navigator.pop();
                      _loadReviews();
                    },
                    child: const Text('Submit review'),
                  ),
                ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _loadReviews() async {
    final auth = context.read<AuthProvider>();
    _client.updateToken(auth.token);
    setState(() => _loadingReviews = true);
    final (items, _, _) = await _reviewApi.fetchReviews(widget.medicine.id);
    if (!mounted) return;
    if (items.isNotEmpty) {
      setState(() {
        _reviews = items;
      });
    }
    setState(() => _loadingReviews = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cart = context.watch<CartProvider>();
    final galleryImages = _images;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.medicine.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: CartBubbleFab(
        itemCount: cart.totalItems,
        bottomInset: cart.bottomInset,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CartScreen()),
          );
        },
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGallery(theme, galleryImages),
            const SizedBox(height: 16),
            Text(
              widget.medicine.name,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            if (widget.medicine.manufacturer != null &&
                widget.medicine.manufacturer!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: _ManufacturerBlock(
                  manufacturer: widget.medicine.manufacturer!,
                  theme: theme,
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.star, size: 20, color: Colors.amber),
                const SizedBox(width: 4),
                Text(
                  widget.medicine.rating.toStringAsFixed(1),
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(width: 4),
                Text(
                  '(${widget.medicine.ratingCount})',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    widget.medicine.category,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '\$${widget.medicine.price.toStringAsFixed(2)}',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 16),
            _CartSummary(cart: cart),
            const SizedBox(height: 16),
            if (widget.medicine.description.isNotEmpty) ...[
              Text(
                'Description',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                widget.medicine.description,
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
            ],
            Text(
              'Usage',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.medicine.usage?.trim().isNotEmpty == true
                  ? widget.medicine.usage!
                  : 'No usage information available yet.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey[700],
              ),
            ),
            if (widget.medicine.warnings.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Health warnings',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.red[700],
                ),
              ),
              const SizedBox(height: 8),
              Column(
                children: widget.medicine.warnings.map((warning) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFECEC),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.warning_amber_rounded,
                          color: Colors.red[700],
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            warning,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.red[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Primary patients',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            if (widget.medicine.primaryConditions.isNotEmpty)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.medicine.primaryConditions
                    .map(
                      (cond) => Chip(
                        label: Text(cond),
                        backgroundColor:
                            theme.colorScheme.surfaceContainerHighest.withValues(
                          alpha: 0.6,
                        ),
                        labelStyle: theme.textTheme.bodySmall,
                      ),
                    )
                    .toList(),
              )
            else
              Text(
                'No specific patient group information available.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[700],
                ),
              ),
            const SizedBox(height: 20),
            Text(
              'Reviews',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            if (_loadingReviews)
              const Center(child: CircularProgressIndicator())
            else if (_reviews.isEmpty)
              Text(
                'No reviews yet. Be the first to share your experience.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[700],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _reviews.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  return _ReviewTile(review: _reviews[index]);
                },
              ),
            const SizedBox(height: 12),
            _buildReviewAction(theme),
            if (widget.medicine.ingredients.isNotEmpty) ...[
              Text(
                'Active ingredients',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.medicine.ingredients
                    .map(
                      (ing) => Chip(
                        label: Text(ing),
                        backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
            if (widget.medicine.seasons.isNotEmpty) ...[
              Text(
                'Seasonal relevance',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: widget.medicine.seasons
                    .map(
                      (s) => Chip(
                        label: Text(s.name),
                        visualDensity: VisualDensity.compact,
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: PrimaryButton(
            label: 'Add to cart',
            icon: Icons.add_shopping_cart_rounded,
            onPressed: () {
              cart.addToCart(widget.medicine);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildGallery(ThemeData theme, List<String> galleryImages) {
    if (galleryImages.isEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          height: 220,
          color: theme.colorScheme.primary.withValues(alpha: 0.08),
          alignment: Alignment.center,
          child: Icon(
            Icons.medication_rounded,
            color: theme.colorScheme.primary,
            size: 64,
          ),
        ),
      );
    }

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 220,
            child: PageView.builder(
              controller: _pageController,
              physics: const PageScrollPhysics(),
              itemCount: galleryImages.length,
              onPageChanged: (index) {
                setState(() => _currentImageIndex = index);
              },
              itemBuilder: (context, index) {
                final url = galleryImages[index];
              return Image.network(
                url,
                width: double.infinity,
                height: 220,
                fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: double.infinity,
                      height: 220,
                      color: theme.colorScheme.primary.withValues(alpha: 0.08),
                      alignment: Alignment.center,
                      child: Icon(
                        Icons.broken_image_outlined,
                        color: theme.colorScheme.primary.withValues(alpha: 0.7),
                        size: 40,
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (galleryImages.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(galleryImages.length, (index) {
              final isActive = index == (_currentImageIndex % galleryImages.length);
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: isActive ? 10 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: isActive
                      ? theme.colorScheme.primary
                      : theme.colorScheme.primary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(999),
                ),
              );
            }),
          ),
      ],
    );
  }
}

class _ManufacturerBlock extends StatelessWidget {
  final String manufacturer;
  final ThemeData theme;

  const _ManufacturerBlock({required this.manufacturer, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.factory_outlined,
          size: 20,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Manufacturer',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.8),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                manufacturer,
                style: theme.textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CartSummary extends StatelessWidget {
  final CartProvider cart;

  const _CartSummary({required this.cart});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.shopping_cart_outlined),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              cart.totalItems == 0
                  ? 'Your cart is empty'
                  : '${cart.totalItems} item${cart.totalItems == 1 ? '' : 's'} in cart',
              style: theme.textTheme.bodyMedium,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          if (cart.totalItems > 0)
            Text(
              '\$ ${cart.totalPrice.toStringAsFixed(0)}',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          if (cart.totalItems > 0) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: () {
                Navigator.of(
                  context,
                ).push(MaterialPageRoute(builder: (_) => const CartScreen()));
              },
              child: const Text('View'),
            ),
          ],
        ],
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  final MedicineReview review;

  const _ReviewTile({required this.review});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15),
            child: Text(
              review.userName.isNotEmpty ? review.userName[0].toUpperCase() : '?',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      review.userName,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.star, size: 14, color: Colors.amber[700]),
                    const SizedBox(width: 2),
                    Text(
                      review.rating.toStringAsFixed(1),
                      style: theme.textTheme.bodySmall,
                    ),
                    const Spacer(),
                    Text(
                      '${review.date.month}/${review.date.day}/${review.date.year}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  review.comment,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
