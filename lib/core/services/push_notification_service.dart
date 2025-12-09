import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';

import '../../features/orders/presentation/screens/orders_screen.dart';
import '../providers/order_provider.dart';
import '../routes/app_routes.dart';
import '../routes/navigation.dart';
import 'api_client.dart';
import 'device_token_api_service.dart';

const AndroidNotificationChannel _orderChannel = AndroidNotificationChannel(
  'order_status_updates',
  'Order updates',
  description: 'Notifications about order status changes',
  importance: Importance.max,
);

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

class PushNotificationService {
  PushNotificationService._internal();

  static final PushNotificationService instance = PushNotificationService._internal();

  FirebaseMessaging? _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final ApiClient _client = ApiClient();
  late final DeviceTokenApiService _deviceTokenApi = DeviceTokenApiService(_client);

  bool _initialized = false;
  bool _firebaseReady = false;
  String? _authToken;
  String? _cachedFcmToken;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    if (kIsWeb) return;

    try {
      await Firebase.initializeApp();
      _firebaseReady = true;
      _messaging = FirebaseMessaging.instance;
    } catch (err) {
      debugPrint('Firebase init failed for push notifications: $err');
      return;
    }
    if (_messaging == null) return;

    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await _configureLocalNotifications();
    await _requestPermissions();
    await _messaging!.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageNavigation);

    final initialMessage = await _messaging!.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageNavigation(initialMessage);
    }

    _messaging!.onTokenRefresh.listen((token) {
      _cachedFcmToken = token;
      _sendTokenToBackend(token);
    });
  }

  void updateAuthToken(String? token) {
    _authToken = token;
    _client.updateToken(token);
  }

  Future<void> syncTokenWithBackend() async {
    if (_authToken == null || kIsWeb || !_firebaseReady) return;
    final token = await _messaging?.getToken();
    if (token == null) return;
    _cachedFcmToken = token;
    await _sendTokenToBackend(token);
  }

  Future<void> unregisterDeviceToken() async {
    if (_authToken == null || _cachedFcmToken == null || kIsWeb || !_firebaseReady) return;
    await _deviceTokenApi.removeToken(_cachedFcmToken!);
  }

  Future<void> _requestPermissions() async {
    if (kIsWeb) return;
    await _messaging?.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );
  }

  Future<void> _configureLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        if (details.payload == null) return;
        try {
          final data = jsonDecode(details.payload!);
          if (data is Map<String, dynamic>) {
            _handleNotificationData(data.map((key, value) => MapEntry(key, value.toString())));
          }
        } catch (_) {}
      },
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_orderChannel);
  }

  void _handleForegroundMessage(RemoteMessage message) {
    _showLocalNotification(message);
  }

  void _handleMessageNavigation(RemoteMessage message) {
    final data = message.data.map((key, value) => MapEntry(key, value.toString()));
    _handleNotificationData(data);
  }

  void _handleNotificationData(Map<String, String> data) {
    final orderId = data['orderId'] ?? data['order_id'];
    if (orderId == null || orderId.isEmpty) return;
    _navigateToOrder(orderId);
  }

  Future<void> _navigateToOrder(String orderId) async {
    final navigator = rootNavigatorKey.currentState;
    if (navigator == null || !navigator.mounted) {
      Future.delayed(const Duration(milliseconds: 400), () => _navigateToOrder(orderId));
      return;
    }
    final context = navigator.context;
    if (_authToken == null) return;

    final orders = context.read<OrderProvider>();
    orders.updateToken(_authToken);
    final fetched = await orders.fetchOrder(orderId);
    if (navigator.mounted) {
      if (fetched != null) {
        navigator.pushNamed(
          AppRoutes.orderDetail,
          arguments: OrderDetailArgs(order: fetched),
        );
      } else {
        navigator.pushNamed(AppRoutes.orders);
      }
    }
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final data = message.data.map((key, value) => MapEntry(key, value.toString()));
    final title = notification?.title ?? 'Order update';
    final body = notification?.body ??
        data['body'] ??
        'Your order has been updated. Tap to view the details.';
    final payload = jsonEncode(data);

    final androidDetails = AndroidNotificationDetails(
      _orderChannel.id,
      _orderChannel.name,
      channelDescription: _orderChannel.description,
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );
    const iosDetails = DarwinNotificationDetails(presentAlert: true, presentSound: true);

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: payload,
    );
  }

  Future<void> _sendTokenToBackend(String token) async {
    if (_authToken == null || token.isEmpty) return;
    await _deviceTokenApi.registerToken(token: token, platform: _platformLabel());
  }

  String _platformLabel() {
    if (kIsWeb) return 'web';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      default:
        return 'unknown';
    }
  }
}
