import 'package:intl/intl.dart';

import 'l10n/strings.dart';

/// Dates, in the two languages and in the register a reader expects.
///
/// A story from this morning says "3 hours ago"; one from last week says the
/// date. News apps that show an absolute timestamp on everything make fresh
/// stories look stale, and ones that show "14 days ago" on everything make the
/// archive unreadable.
abstract final class Dates {
  const Dates._();

  /// `en_IN` throughout — d MMM yyyy, not the American order. The audience is
  /// in Tamil Nadu and the admin panel already formats this way.
  ///
  /// `main()` loads this locale's symbols before `runApp`. It has to: `intl`
  /// compiles in only en_US and throws on any other locale that has not been
  /// initialised.
  static const _locale = 'en_IN';

  /// Formats, or gives up quietly.
  ///
  /// A timestamp is decoration on a news card; the headline is the point. This
  /// once shipped without [_locale] being initialised and the resulting throw
  /// — raised inside build() — took out every card that rendered a date, which
  /// looked from the outside like the newsroom had gone dark. A date that
  /// cannot be formatted now costs its own line and nothing else.
  static String _format(String pattern, DateTime? date) {
    if (date == null) return '';
    try {
      return DateFormat(pattern, _locale).format(date);
    } catch (_) {
      return '';
    }
  }

  static String short(DateTime? date) => _format('d MMM yyyy', date);

  static String dayAndMonth(DateTime? date) => _format('d MMM', date);

  static String monthAndYear(DateTime? date) => _format('MMMM yyyy', date);

  static String time(DateTime? date) => _format('h:mm a', date);

  /// A full event line: "Sat 14 Mar, 6:30 pm".
  static String eventStamp(DateTime? date) =>
      _format('EEE d MMM, h:mm a', date);

  /// The two halves of the calendar block on an event card.
  static String dayNumber(DateTime? date) => _format('d', date);

  static String monthAbbrev(DateTime? date) => _format('MMM', date);

  /// Relative for anything inside a week, absolute beyond it.
  static String relative(DateTime? date, Strings strings) {
    if (date == null) return '';

    final now = DateTime.now();
    final difference = now.difference(date);

    // A clock skew between the phone and the server can put a just-published
    // story a few seconds in the future. Treat that as "now" rather than
    // printing a negative age.
    if (difference.isNegative || difference.inMinutes < 1) {
      return strings.isTamil ? 'இப்போது' : 'Just now';
    }
    if (difference.inHours < 1) {
      final minutes = difference.inMinutes;
      return strings.isTamil
          ? '$minutes நிமிடங்களுக்கு முன்'
          : '$minutes min ago';
    }
    if (difference.inHours < 24) {
      final hours = difference.inHours;
      return strings.isTamil
          ? '$hours மணி நேரத்திற்கு முன்'
          : '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    }
    if (difference.inDays < 7) {
      final days = difference.inDays;
      if (days == 1) return strings.isTamil ? 'நேற்று' : 'Yesterday';
      return strings.isTamil
          ? '$days நாட்களுக்கு முன்'
          : '$days days ago';
    }
    return short(date);
  }

  /// For an event: "Today", "Tomorrow", or the date. Events are read forwards,
  /// so the wording is about what is coming rather than what has passed.
  static String eventDay(DateTime? date, Strings strings) {
    if (date == null) return '';
    final now = DateTime.now();
    final startOfToday = DateTime(now.year, now.month, now.day);
    final startOfDate = DateTime(date.year, date.month, date.day);
    final days = startOfDate.difference(startOfToday).inDays;

    if (days == 0) return strings.today;
    if (days == 1) return strings.tomorrow;
    return _format('EEE d MMM', date);
  }
}
