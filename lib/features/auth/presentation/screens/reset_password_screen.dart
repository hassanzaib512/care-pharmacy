import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/utils/snackbar.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppTextField(
                controller: _emailController,
                label: 'Email',
                hint: 'you@example.com',
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Email is required';
                  if (!value.contains('@')) return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              AppTextField(
                controller: _tokenController,
                label: 'Token',
                hint: 'Enter reset token',
                validator: (value) =>
                    (value == null || value.isEmpty) ? 'Token required' : null,
              ),
              const SizedBox(height: 14),
              AppTextField(
                controller: _passwordController,
                label: 'New password',
                hint: '******',
                obscureText: true,
                validator: (value) =>
                    (value == null || value.length < 6) ? 'Min 6 characters' : null,
              ),
              const SizedBox(height: 14),
              AppTextField(
                controller: _confirmController,
                label: 'Confirm password',
                hint: '******',
                obscureText: true,
                validator: (value) =>
                    (value != _passwordController.text) ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Reset password',
                isLoading: _loading,
                onPressed: _loading ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) return;
    setState(() => _loading = true);
    final ok = await context.read<AuthProvider>().api.resetPassword(
          email: _emailController.text.trim(),
          token: _tokenController.text.trim(),
          newPassword: _passwordController.text.trim(),
        );
    if (!mounted) return;
    setState(() => _loading = false);
    showCartAwareSnackBar(
      context,
      message: ok ? 'Password reset successful' : 'Reset failed',
      isError: !ok,
    );
    if (ok) {
      Navigator.pop(context);
    }
  }
}
