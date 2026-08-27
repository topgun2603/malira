import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Push notifications.
///
/// **Topics, not device tokens.** Almost nobody using this app has an account —
/// the news is open to everyone and only matrimony asks anyone to sign in — so
/// there is no uid to file a token against, and a `deviceTokens` collection
/// writable by anonymous callers is a liability nobody needs. Subscribing to a
/// topic pushes the bookkeeping onto FCM: the desk sends to `all` or `news` and
/// every installed copy of the app gets it, signed in or not.
///
/// The topics mirror `NOTIFICATION_AUDIENCES` in the admin panel exactly, so a
/// message composed for "Event subscribers" reaches the devices subscribed to
/// `events` and nothing else.
class PushRepository {
  PushRepository(this._messaging, this._local);

  final FirebaseMessaging _messaging;
  final FlutterLocalNotificationsPlugin _local;

  /// Everything the desk can address. `all` is the default and the one every
  /// device joins; the rest are opt-out from settings later.
  static const topics = <String>['all', 'news', 'events', 'songs'];

  /// The channel Android groups these under. Named rather than generic so a
  /// reader who mutes it in system settings knows what they muted.
  static const _channel = AndroidNotificationChannel(
    'nilgiri_news_general',
    'News and announcements',
    description: 'Breaking stories, events and notices from the association.',
    importance: Importance.high,
  );

  /// Asks once, subscribes, and wires up foreground display.
  ///
  /// Failures here are deliberately swallowed. Push is a courtesy on top of a
  /// news app that works perfectly without it — a device that refuses
  /// permission, or has no Play Services, must still open to the feed rather
  /// than to an error.
  Future<void> start({
    required void Function(RemoteMessage) onOpened,
  }) async {
    try {
      await _messaging.requestPermission(alert: true, badge: true, sound: true);

      await _local.initialize(
        const InitializationSettings(
          // Uses the launcher icon; Android requires a small icon and a
          // transparent silhouette is the platform convention.
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        ),
      );

      await _local
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(_channel);

      for (final topic in topics) {
        await _messaging.subscribeToTopic(topic);
      }

      // Android shows nothing itself while the app is in front, so the
      // foreground case has to be drawn by hand or a reader watching the feed
      // would never learn a story had broken.
      FirebaseMessaging.onMessage.listen(_show);
      FirebaseMessaging.onMessageOpenedApp.listen(onOpened);

      // Opened from cold, by tapping the notification.
      final initial = await _messaging.getInitialMessage();
      if (initial != null) onOpened(initial);
    } catch (error) {
      debugPrint('push unavailable: $error');
    }
  }

  Future<void> _show(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _local.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }

  /// Where a tapped notification should land.
  ///
  /// Mirrors `targetType` / `targetId` on the notification document, so the
  /// desk deep-links a push at the story it is about rather than dropping the
  /// reader on the front page to go and find it.
  static String? routeFor(RemoteMessage message) {
    final data = message.data;
    final type = data['targetType'] as String?;
    final id = data['targetId'] as String?;
    if (id == null || id.isEmpty) return null;

    return switch (type) {
      'article' => '/article/$id',
      'event' => '/event/$id',
      'song' => '/songs',
      _ => null,
    };
  }
}
