import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/profile_provider.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/utils/google_auth_helper.dart';
import '../../../../core/utils/snackbar.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showError = false;
  bool _passwordObscured = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/icons/app_logo.png',
                    width: 80,
                    height: 80,
                    fit: BoxFit.fill,
                  ),
                ),
                const SizedBox(height: 16),
                Text('Care Pharmacy', style: theme.textTheme.headlineMedium),
                const SizedBox(height: 8),
                Text(
                  'Your trusted health partner',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 32),
          _buildForm(context),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () {
                Navigator.pushNamed(context, AppRoutes.forgotPassword);
              },
              child: const Text('Forgot password?'),
            ),
          ),
          const SizedBox(height: 4),
          if (_showError)
            Text(
              'Invalid credentials. Please check your email and password and try again.',
              style: TextStyle(color: Colors.red.shade700),
              textAlign: TextAlign.center,
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: PrimaryButton(
                        label: 'Login',
                        onPressed: () => _handleLogin(context),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GoogleLoginButton(
                        onPressed: () => _handleGoogleLogin(context),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('New here?'),
                    TextButton(
                      onPressed: () => Navigator.pushReplacementNamed(
                        context,
                        AppRoutes.signup,
                      ),
                      child: const Text('Create account'),
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

  Widget _buildForm(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          AppTextField(
            controller: _emailController,
            label: 'Email',
            hint: 'you@example.com',
            icon: Icons.mail_outline,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Email is required';
              }
              if (!value.contains('@')) {
                return 'Enter a valid email';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _passwordController,
            label: 'Password',
            hint: 'Enter your password',
            icon: Icons.lock_outline,
            obscureText: true,
            showVisibilityToggle: true,
            isObscured: _passwordObscured,
            onToggleVisibility: () {
              setState(() => _passwordObscured = !_passwordObscured);
            },
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Password is required';
              }
              if (value.length < 6) {
                return 'Password must be at least 6 characters';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin(BuildContext context) async {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final auth = context.read<AuthProvider>();

    final success = await auth.login(email, password);
    if (!context.mounted) return;
    if (!success) {
      setState(() => _showError = true);
      return;
    }
    setState(() => _showError = false);
    final profile = context.read<ProfileProvider>();
    final cart = context.read<CartProvider>();
    final navigator = Navigator.of(context);
    // Sync profile provider token and fetch profile
    profile.updateToken(auth.token);
    await profile.fetchProfile();
    if (!context.mounted) return;
    cart.clear();
    navigator.pushReplacementNamed(AppRoutes.home);
  }

  Future<void> _handleGoogleLogin(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final cart = context.read<CartProvider>();
    final profile = context.read<ProfileProvider>();
    final idToken = await GoogleAuthHelper.signInAndGetIdToken();
    if (!context.mounted) return;
    if (idToken == null) {
      showCartAwareSnackBar(context, message: 'Google sign-in failed', isError: true);
      return;
    }
    final success = await auth.loginWithGoogle(idToken);
    if (!context.mounted) return;
    if (!success) {
      showCartAwareSnackBar(context, message: 'Google login failed', isError: true);
      return;
    }
    profile.updateToken(auth.token);
    await profile.fetchProfile();
    if (!context.mounted) return;
    cart.clear();
    final navigator = Navigator.of(context);
    navigator.pushReplacementNamed(AppRoutes.home);
  }
}

class GoogleLoginButton extends StatelessWidget {
  final VoidCallback onPressed;

  const GoogleLoginButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side:
            BorderSide(color: theme.colorScheme.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Image.asset(
            'assets/icons/google_logo.png',
            height: 35,
            width: 35,
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              'Google',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
