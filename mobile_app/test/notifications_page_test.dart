import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nilgiri_news/src/core/theme/app_theme.dart';
import 'package:nilgiri_news/src/state/preferences.dart';
import 'package:nilgiri_news/src/ui/news/notifications_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The screen rendered in Tamil.
///
/// On device it once came up in English while the feed behind it was Tamil,
/// which would mean the page was reading a different language than the rest of
/// the app. This pins the page to the same preference the feed uses.
void main() {
  testWidgets('the notifications screen follows the reader language', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({'nilgiri-news:lang': 'ta'});
    final store = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(store),
          announcementsProvider.overrideWith((ref) => Stream.value(const [])),
        ],
        child: MaterialApp(
            theme: AppTheme.light(),
            home: const NotificationsPage(),
          ),
      ),
    );
    await tester.pump();

    expect(find.text('அறிவிப்புகள்'), findsOneWidget);
    expect(find.text('Notifications'), findsNothing);
  });
}
