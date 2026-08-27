import 'package:flutter_test/flutter_test.dart';
import 'package:nilgiri_news/src/core/l10n/strings.dart';

void main() {
  test('the notification copy is translated', () {
    const ta = Strings(ReaderLanguage.ta);
    expect(ta.notifications, 'அறிவிப்புகள்');
    expect(ta.noNotifications, isNot('Nothing yet'));
    expect(ta.noNotificationsBody, isNot(startsWith('Announcements')));
  });
}
