import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Firebase project configuration for `nilgiri-news`.
///
/// These values are the ones already in `web-admin/.env.local`. They are
/// identifiers, not secrets — a Firebase web API key is designed to ship in a
/// client bundle, and what actually protects the data is `firestore.rules`,
/// which is why that file is where the security review belongs.
///
/// Android now carries its own registration — its own app id and API key, with
/// the signing certificate's SHA-1 and SHA-256 on file. That registration is
/// what phone (SMS) sign-in requires: Firebase will not send an OTP on behalf
/// of a build whose certificate it does not recognise.
///
/// `android/app/google-services.json` holds the same values for the native
/// side. Both are generated, so if the signing certificate ever changes — a
/// real upload key for the Play Store, say — the new fingerprint has to be
/// added to the Firebase project or SMS sign-in stops working with
/// `app-not-authorized`.
///
/// iOS is still on the web credentials: no iOS app is registered, and nothing
/// is shipping there yet. Run `flutterfire configure --project=nilgiri-news`
/// when that changes.
class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => android,
      TargetPlatform.iOS => ios,
      TargetPlatform.macOS => ios,
      _ => web,
    };
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAD-08M53oBl5aQyH_wPOMrcpUoPczScUM',
    appId: '1:418553143127:web:2705278af4342ede0e6812',
    messagingSenderId: '418553143127',
    projectId: 'nilgiri-news',
    authDomain: 'nilgiri-news.firebaseapp.com',
    storageBucket: 'nilgiri-news.firebasestorage.app',
    measurementId: 'G-8GX0Z3MDLR',
  );

  /// The registered Android app. Matches `android/app/google-services.json`.
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDHa9wDUfsS9sG1J6DNuv_xLHrL3JfMwlg',
    appId: '1:418553143127:android:0b1ea8eaf924ac410e6812',
    messagingSenderId: '418553143127',
    projectId: 'nilgiri-news',
    storageBucket: 'nilgiri-news.firebasestorage.app',
  );

  /// Still the web credentials: no iOS app is registered yet.
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAD-08M53oBl5aQyH_wPOMrcpUoPczScUM',
    appId: '1:418553143127:web:2705278af4342ede0e6812',
    messagingSenderId: '418553143127',
    projectId: 'nilgiri-news',
    storageBucket: 'nilgiri-news.firebasestorage.app',
    iosBundleId: 'com.nilgirinews.nilgiriNews',
  );
}
