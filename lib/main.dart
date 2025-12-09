import 'package:flutter/material.dart';

import 'app.dart';
import 'core/routes/navigation.dart';
import 'core/services/push_notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushNotificationService.instance.initialize();
  runApp(CarePharmacyApp(navigatorKey: rootNavigatorKey));
}
