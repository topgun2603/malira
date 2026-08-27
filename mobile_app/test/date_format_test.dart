import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:nilgiri_news/src/core/format.dart';
import 'package:nilgiri_news/src/core/l10n/strings.dart';

/// Regression cover for the bug that made the app look empty.
///
/// `Dates` formats in `en_IN`, and `intl` compiles in only `en_US` — every
/// other locale has to be loaded at runtime. The first build of this app never
/// loaded it, so `DateFormat` threw. Because that throw happened inside
/// `build()`, there was no error screen: it killed every widget that rendered a
/// date (article cards, event cards, the masthead) and spared the ones that did
/// not (songs, category chips). The feed looked like it had no stories in it
/// while Firestore was returning nine.
///
/// Two things are asserted here, and the order matters — the uninitialised
/// checks have to run before anything loads the locale, and `flutter test`
/// gives each file its own isolate so nothing else can have loaded it first.
void main() {
  final date = DateTime(2026, 3, 14, 18, 30);

  group('before locale data is loaded', () {
    test('formatting degrades to empty instead of throwing', () {
      // The headline is the point; the timestamp is decoration. Losing the
      // date must never cost the story.
      expect(Dates.short(date), isA<String>());
      expect(Dates.monthAndYear(date), isA<String>());
      expect(Dates.time(date), isA<String>());
      expect(Dates.eventStamp(date), isA<String>());
      expect(Dates.dayNumber(date), isA<String>());
      expect(Dates.monthAbbrev(date), isA<String>());
    });

    test('relative dates never depend on locale data at all', () {
      // These are hand-written in both languages precisely so a fresh story
      // always carries a timestamp, whatever the locale state.
      const english = Strings(ReaderLanguage.en);
      const tamil = Strings(ReaderLanguage.ta);
      final justNow = DateTime.now().subtract(const Duration(seconds: 10));

      expect(Dates.relative(justNow, english), 'Just now');
      expect(Dates.relative(justNow, tamil), 'இப்போது');
    });
  });

  group('once main() has loaded en_IN', () {
    setUpAll(() async => initializeDateFormatting('en_IN'));

    test('dates read in Indian order, not American', () {
      expect(Dates.short(date), '14 Mar 2026');
      expect(Dates.dayAndMonth(date), '14 Mar');
      expect(Dates.monthAndYear(date), 'March 2026');
    });

    test('event stamps carry the weekday and the time', () {
      expect(Dates.eventStamp(date), startsWith('Sat 14 Mar'));
      expect(Dates.dayNumber(date), '14');
      expect(Dates.monthAbbrev(date), 'Mar');
    });

    test('null dates are blank, never the epoch', () {
      expect(Dates.short(null), '');
      expect(Dates.eventStamp(null), '');
      expect(Dates.dayNumber(null), '');
    });
  });

  group('relative wording', () {
    const english = Strings(ReaderLanguage.en);
    final now = DateTime.now();

    test('an hour ago is relative, last month is a date', () {
      expect(
        Dates.relative(now.subtract(const Duration(hours: 3)), english),
        '3 hours ago',
      );
      expect(
        Dates.relative(now.subtract(const Duration(days: 1)), english),
        'Yesterday',
      );
      expect(
        Dates.relative(now.subtract(const Duration(days: 40)), english),
        contains('20'),
      );
    });

    test('a story published a few seconds in the future reads as now', () {
      // Phone clocks drift against the server, and a freshly published story
      // must never be stamped with a negative age.
      final skewed = now.add(const Duration(seconds: 20));
      expect(Dates.relative(skewed, english), 'Just now');
    });
  });
}
