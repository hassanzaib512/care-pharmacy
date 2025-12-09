import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/payment_method.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/order_provider.dart';
import '../../../../core/providers/profile_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/utils/snackbar.dart';
import '../../../common/presentation/widgets/app_drawer.dart';
import '../../../../core/theme/app_theme.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  bool _uploading = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final email = context.read<AuthProvider>().currentEmail;
    if (email != null) {
      final profile = context.read<ProfileProvider>().profileFor(email);
      _nameController.text = profile.name;
      _phoneController.text = profile.phone;
      _addressController.text = profile.address;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.currentEmail != null
        ? context.watch<ProfileProvider>().profileFor(auth.currentEmail!)
        : null;
    final totalSpend = profile?.totalSpend ??
        context.watch<OrderProvider>().totalSpend;
    final hasAvatar = (profile?.avatarUrl ?? '').isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      drawer: const AppDrawer(currentRoute: AppRoutes.profile),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Stack(
                children: [
                  GestureDetector(
                    onTap: hasAvatar && !_uploading
                        ? () => _openAvatar(context, profile!.avatarUrl)
                        : null,
                    child: CircleAvatar(
                      radius: 32,
                      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                      backgroundImage: hasAvatar
                          ? NetworkImage(profile!.avatarUrl)
                          : null,
                      child: hasAvatar
                          ? null
                          : const Icon(Icons.person, color: AppTheme.primaryColor, size: 28),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _uploading ? null : () => _pickAvatar(context),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: _uploading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.camera_alt, size: 16, color: AppTheme.primaryColor),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auth.currentEmail ?? 'Guest',
                      style: Theme.of(context).textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      'Manage your contact and address details',
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          AppTextField(
            controller: _nameController,
            label: 'Full name',
            hint: 'Jane Doe',
            icon: Icons.badge_outlined,
          ),
          const SizedBox(height: 12),
          AppTextField(
            controller: _phoneController,
            label: 'Phone',
            hint: '+1 222 333 4444',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          AppTextField(
            controller: _addressController,
            label: 'Address',
            hint: '123 Health Street, Wellness City',
            icon: Icons.home_outlined,
          ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: 'Save changes',
            onPressed: () {
              if (auth.currentEmail == null) return;
              context.read<ProfileProvider>().updateProfile(
                email: auth.currentEmail!,
                name: _nameController.text.trim(),
                phone: _phoneController.text.trim(),
                address: _addressController.text.trim(),
              );
              showCartAwareSnackBar(
                context,
                message: 'Profile updated',
              );
            },
            icon: Icons.check_circle_outline,
          ),
          const SizedBox(height: 24),
          _TotalSpendCard(totalSpend: totalSpend),
          const SizedBox(height: 24),
          Text(
            'Payment Details',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          if (profile?.defaultPaymentMethod != null)
            _PaymentSummaryCard(method: profile!.defaultPaymentMethod!),
          if (profile?.defaultPaymentMethod == null)
            Text(
              'No payment method added yet.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
            ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: 'Add / Edit Payment Method',
            onPressed: () =>
                Navigator.pushNamed(context, AppRoutes.paymentDetails),
            isOutlined: true,
            icon: Icons.edit_outlined,
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: 'Change Password',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
              );
            },
            isOutlined: true,
            icon: Icons.lock_reset,
          ),
        ],
      ),
    );
  }

  Future<void> _pickAvatar(BuildContext context) async {
    final provider = context.read<ProfileProvider>();

    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );

    if (!context.mounted || file == null) return;

    setState(() => _uploading = true);
    final ok = await provider.uploadAvatar(file.path);

    if (!context.mounted) return;

    setState(() => _uploading = false);
    showCartAwareSnackBar(
      context,
      message: ok ? 'Profile photo updated' : 'Failed to upload photo',
      isError: !ok,
    );
  }

  void _openAvatar(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) {
        return GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            color: Colors.black.withValues(alpha: 0.85),
            alignment: Alignment.center,
            child: InteractiveViewer(
              child: Hero(
                tag: 'profile-avatar',
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.broken_image_outlined,
                    color: Colors.white,
                    size: 64,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PaymentSummaryCard extends StatelessWidget {
  final PaymentMethod method;

  const _PaymentSummaryCard({required this.method});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.credit_card, color: AppTheme.primaryColor),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        method.maskedNumber,
                        style: Theme.of(context).textTheme.titleMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        method.brand ?? 'Card on file',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Cardholder: ${method.cardHolderName}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text('Exp: ${method.expiryMonth}/${method.expiryYear}'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TotalSpendCard extends StatelessWidget {
  final double totalSpend;

  const _TotalSpendCard({required this.totalSpend});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.stacked_line_chart, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total spent in Care Pharmacy',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                Text(
                  '\$ ${totalSpend.toStringAsFixed(2)}',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(color: AppTheme.primaryColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
