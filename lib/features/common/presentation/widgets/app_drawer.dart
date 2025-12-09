import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/theme/app_theme.dart';

class AppDrawer extends StatelessWidget {
  final String currentRoute;

  const AppDrawer({super.key, required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryColor, AppTheme.accentColor],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Colors.white,
                    child: Image.asset(
                      'assets/icons/app_logo.png',
                      width: 60,
                      height: 60,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Care Pharmacy',
                    style: Theme.of(
                      context,
                    ).textTheme.titleLarge?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    auth.currentEmail ?? 'Welcome',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ],
              ),
            ),
            _DrawerItem(
              icon: Icons.home_outlined,
              label: 'Home',
              isSelected: currentRoute == AppRoutes.home,
              onTap: () => _navigate(context, AppRoutes.home),
            ),
            _DrawerItem(
              icon: Icons.receipt_long_outlined,
              label: 'Orders',
              isSelected: currentRoute == AppRoutes.orders,
              onTap: () => _navigate(context, AppRoutes.orders),
            ),
            _DrawerItem(
              icon: Icons.person_outline,
              label: 'Profile',
              isSelected: currentRoute == AppRoutes.profile,
              onTap: () => _navigate(context, AppRoutes.profile),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red.shade700,
                  side: BorderSide(color: Colors.red.shade200),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: () async {
                  final navigator = Navigator.of(context);
                  final cart = context.read<CartProvider>();
                  cart.clear();
                  await context.read<AuthProvider>().logout();
                  if (!navigator.mounted) return;
                  navigator.pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, String route) {
    if (ModalRoute.of(context)?.settings.name == route) {
      Navigator.pop(context);
      return;
    }
    Navigator.pop(context);
    Navigator.pushReplacementNamed(context, route);
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: isSelected ? AppTheme.primaryColor : null),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          color: isSelected ? AppTheme.primaryColor : null,
        ),
      ),
      onTap: onTap,
    );
  }
}
