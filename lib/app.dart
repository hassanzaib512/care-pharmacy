import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/providers/auth_provider.dart';
import 'core/providers/order_provider.dart';
import 'core/providers/profile_provider.dart';
import 'core/providers/cart_provider.dart';
import 'core/providers/medicine_provider.dart';
import 'core/routes/app_routes.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/auth/presentation/screens/signup_screen.dart';
import 'features/auth/presentation/screens/forgot_password_screen.dart';
import 'features/auth/presentation/screens/reset_password_screen.dart';
import 'features/home/presentation/screens/home_screen.dart';
import 'features/orders/presentation/screens/order_detail_screen.dart';
import 'features/orders/presentation/screens/orders_screen.dart';
import 'features/payment/presentation/screens/payment_details_screen.dart';
import 'features/profile/presentation/screens/profile_screen.dart';
import 'features/home/presentation/screens/medicine_detail_screen.dart';

class CarePharmacyApp extends StatelessWidget {
  const CarePharmacyApp({super.key, required this.navigatorKey});

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProfileProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => MedicineProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'Care Pharmacy',
            debugShowCheckedModeBanner: false,
            navigatorKey: navigatorKey,
            theme: AppTheme.lightTheme,
            onGenerateRoute: (settings) {
              switch (settings.name) {
                case AppRoutes.signup:
                  return _pageRoute(const SignupScreen());
                case AppRoutes.orders:
                  return _pageRoute(const OrdersScreen());
                case AppRoutes.profile:
                  return _pageRoute(const ProfileScreen());
                case AppRoutes.paymentDetails:
                  return _pageRoute(const PaymentDetailsScreen());
                case AppRoutes.forgotPassword:
                  return _pageRoute(const ForgotPasswordScreen());
                case AppRoutes.resetPassword:
                  return _pageRoute(const ResetPasswordScreen());
                case AppRoutes.medicineDetail:
                  final args = settings.arguments as MedicineDetailArgs;
                  return _pageRoute(
                    MedicineDetailScreen(medicine: args.medicine),
                  );
                case AppRoutes.orderDetail:
                  final args = settings.arguments as OrderDetailArgs;
                  return _pageRoute(OrderDetailScreen(order: args.order));
                case AppRoutes.home:
                  return _pageRoute(const HomeScreen());
                case AppRoutes.login:
                default:
                  return _pageRoute(const LoginScreen());
              }
            },
            home: auth.isLoggedIn ? const HomeScreen() : const LoginScreen(),
          );
        },
      ),
    );
  }

  PageRouteBuilder _pageRoute(Widget page) {
    return PageRouteBuilder(
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (_, animation, _) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0.05, 0.02),
            end: Offset.zero,
          ).animate(animation),
          child: page,
        ),
      ),
    );
  }
}
