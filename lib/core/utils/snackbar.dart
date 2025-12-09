import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/cart_provider.dart';

int _snackToken = 0;

void showCartAwareSnackBar(
  BuildContext context, {
  required String message,
  bool isError = false,
  String? actionLabel,
  VoidCallback? onAction,
  Duration duration = const Duration(seconds: 5),
}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;
  CartProvider? cart;
  try {
    cart = context.read<CartProvider>();
  } catch (_) {}

  cart?.setSnackBarVisible(true);

  const bottomMargin = 12.0;
  final token = ++_snackToken;
  messenger.removeCurrentSnackBar();
  final controller = messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: isError ? Colors.redAccent : null,
      margin: const EdgeInsets.fromLTRB(12, 0, 12, bottomMargin),
      duration: duration,
      action: (actionLabel != null && onAction != null)
          ? SnackBarAction(
              label: actionLabel,
              textColor: Colors.white,
              onPressed: () {
                messenger.hideCurrentSnackBar();
                onAction();
              },
            )
          : null,
    ),
  );

  controller.closed.whenComplete(() {
    if (token == _snackToken) {
      cart?.setSnackBarVisible(false);
    }
  });

  // Extra safeguard to ensure it closes at duration.
  Future.delayed(duration + const Duration(milliseconds: 200), () {
    if (token == _snackToken) {
      messenger.hideCurrentSnackBar();
    }
  });
}
