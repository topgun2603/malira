import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'firebase_options.dart';
import 'src/app.dart';
import 'src/state/preferences.dart';

/// Handles a push that arrives while the app is not running.
///
/// Must be a top-level function annotated for the AOT compiler: Android spins
/// up a *separate* Dart isolate for this, with none of the app's state, so
/// anything it touches has to be initialised here rather than assumed.
///
/// It does no work. Android already draws the notification itself for a message
/// carrying a `notification` block, and the deep link is handled when the
/// reader taps it and the app comes up. The handler exists so registration is
/// explicit rather than leaving the plugin to warn about a missing one.
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Load the date symbols for en_IN before anything can format a date.
  //
  // `intl` ships only en_US data compiled in; every other locale has to be
  // loaded at runtime, and DateFormat *throws* on an uninitialised one. Because
  // that throw happens inside build(), skipping this does not produce an error
  // screen — it takes out every widget that renders a date (each article card,
  // each event card, the masthead) while leaving the widgets that do not
  // render one, which reads exactly like "the news is missing".
  await initializeDateFormatting('en_IN');
  Intl.defaultLocale = 'en_IN';

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);

  // Offline persistence, on deliberately.
  //
  // The readership is spread across hill villages where signal comes and goes.
  // With the cache on, a reader who opened the feed in town still has it on the
  // bus home, and every query in the app answers from disk before it answers
  // from the network. This is the single highest-value line in the file for
  // this particular audience.
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
    cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
  );

  // Read once, synchronously available thereafter, so the first frame is
  // already in the reader's language and theme rather than flashing English.
  final preferences = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(preferences)],
      child: const NilgiriNewsApp(),
    ),
  );
}
