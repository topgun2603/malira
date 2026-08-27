/// YouTube URL handling.
///
/// A direct port of `web-admin/src/lib/youtube.ts`, patterns included. The desk
/// stores only the canonical id and everything else is derived from it, so
/// there is no Data API key to manage and no daily quota to run out of.
///
/// Kept identical to the web version on purpose: an editor pastes a link into
/// the admin panel, and if the app's idea of a valid link differs by one
/// pattern, a video that previewed correctly renders as a grey box in the app.
abstract final class YouTube {
  const YouTube._();

  static final _patterns = <RegExp>[
    RegExp(r'(?:youtube\.com/watch\?(?:.*&)?v=)([\w-]{11})'),
    RegExp(r'(?:youtu\.be/)([\w-]{11})'),
    RegExp(r'(?:youtube\.com/embed/)([\w-]{11})'),
    RegExp(r'(?:youtube\.com/shorts/)([\w-]{11})'),
    RegExp(r'(?:youtube\.com/live/)([\w-]{11})'),
  ];

  static final _bareId = RegExp(r'^[\w-]{11}$');

  /// The 11-character id, or null if this is not a YouTube link.
  static String? extractId(String? url) {
    if (url == null || url.isEmpty) return null;
    for (final pattern in _patterns) {
      final match = pattern.firstMatch(url);
      if (match != null) return match.group(1);
    }
    final trimmed = url.trim();
    return _bareId.hasMatch(trimmed) ? trimmed : null;
  }

  static String thumbnail(String id) =>
      'https://i.ytimg.com/vi/$id/hqdefault.jpg';

  static Uri watchUri(String id) =>
      Uri.parse('https://www.youtube.com/watch?v=$id');
}
