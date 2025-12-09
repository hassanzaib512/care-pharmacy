import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/profile_provider.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../../core/utils/snackbar.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _passwordObscured = true;
  bool _confirmObscured = true;
  String? _inlineError;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Create account'), centerTitle: true),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome to Care Pharmacy',
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: 6),
              Text(
                'Create an account to manage prescriptions, orders, and recommendations.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(height: 24),
              _buildForm(context),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Sign up',
                onPressed: () => _handleSignup(context),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Have an account?'),
                  TextButton(
                    onPressed: () => Navigator.pushReplacementNamed(
                      context,
                      AppRoutes.login,
                    ),
                    child: const Text('Login'),
                  ),
                ],
              ),
            ],
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
            controller: _nameController,
            label: 'Name',
            hint: 'Jane Doe',
            icon: Icons.badge_outlined,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Name is required';
              if (value.trim().length < 2) {
                return 'Enter at least 2 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _emailController,
            label: 'Email',
            hint: 'you@example.com',
            icon: Icons.mail_outline,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) return 'Email is required';
              if (!value.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: _passwordController,
            label: 'Password',
            hint: 'At least 6 characters',
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
          const SizedBox(height: 16),
          AppTextField(
            controller: _confirmPasswordController,
            label: 'Confirm Password',
            hint: 'Re-enter password',
            icon: Icons.lock_reset_outlined,
            obscureText: true,
            showVisibilityToggle: true,
            isObscured: _confirmObscured,
            onToggleVisibility: () {
              setState(() => _confirmObscured = !_confirmObscured);
            },
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Confirm your password';
              }
              if (value != _passwordController.text) {
                return 'Passwords do not match';
              }
              return null;
            },
          ),
          if (_inlineError != null) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _inlineError!,
                style: TextStyle(color: Colors.red.shade700),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _handleSignup(BuildContext context) async {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid) return;

    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final auth = context.read<AuthProvider>();

    final success = await auth.signup(name, email, password);
    if (!mounted) return;
    if (success) {
      setState(() => _inlineError = null);
      final profile = context.read<ProfileProvider>();
      final cart = context.read<CartProvider>();
      final navigator = Navigator.of(context);
      profile.updateProfile(
        email: email.toLowerCase().trim(),
        name: name,
        phone: '',
        address: '',
      );
      cart.clear();
      navigator.pushReplacementNamed(AppRoutes.home);
    } else {
      if (!mounted) return;
      final errorBody = auth.lastSignupError;
      String message = 'Signup failed. Please try again.';
      if (errorBody != null && errorBody.toString().toLowerCase().contains('already exists')) {
        message = 'An account with this email already exists. Please log in or use a different email.';
      }
      setState(() => _inlineError = message);
      showCartAwareSnackBar(
        context,
        message: message,
        isError: true,
      );
    }
  }
}
