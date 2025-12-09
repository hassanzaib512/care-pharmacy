import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/utils/snackbar.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/primary_button.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              AppTextField(
                controller: _currentController,
                label: 'Current password',
                hint: '******',
                obscureText: true,
                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 14),
              AppTextField(
                controller: _newController,
                label: 'New password',
                hint: '******',
                obscureText: true,
                validator: (v) =>
                    (v == null || v.length < 6) ? 'Min 6 characters' : null,
              ),
              const SizedBox(height: 14),
              AppTextField(
                controller: _confirmController,
                label: 'Confirm password',
                hint: '******',
                obscureText: true,
                validator: (v) =>
                    v != _newController.text ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Update password',
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
    final auth = context.read<AuthProvider>();
    final ok = await auth.api.changePassword(
      currentPassword: _currentController.text.trim(),
      newPassword: _newController.text.trim(),
      confirmNewPassword: _confirmController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _loading = false);
    showCartAwareSnackBar(
      context,
      message: ok ? 'Password updated successfully' : 'Failed to update password',
      isError: !ok,
    );
    if (ok) Navigator.pop(context);
  }
}
