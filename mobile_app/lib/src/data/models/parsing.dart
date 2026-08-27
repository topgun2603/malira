import 'package:cloud_firestore/cloud_firestore.dart';

/// Defensive readers for Firestore maps.
///
/// The admin panel writes these documents and is the only thing that does, but
/// a field added there ships before a field added here, and a reader on an old
/// build must not crash on a document shaped slightly newer than the app. Every
/// model below therefore reads through these and never through `data['x'] as T`.
/// This mirrors the `toArticle` mapper in `lib/api/public-news.ts`.
extension FirestoreMap on Map<String, dynamic> {
  String str(String key, [String fallback = '']) {
    final value = this[key];
    return value is String ? value : fallback;
  }

  String? strOrNull(String key) {
    final value = this[key];
    if (value is! String) return null;
    return value.trim().isEmpty ? null : value;
  }

  bool flag(String key, [bool fallback = false]) {
    final value = this[key];
    return value is bool ? value : fallback;
  }

  int integer(String key, [int fallback = 0]) {
    final value = this[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    return fallback;
  }

  List<String> strings(String key) {
    final value = this[key];
    if (value is! List) return const [];
    return value.whereType<String>().toList(growable: false);
  }

  List<Map<String, dynamic>> maps(String key) {
    final value = this[key];
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => entry.cast<String, dynamic>())
        .toList(growable: false);
  }

  Map<String, int> counts(String key) {
    final value = this[key];
    if (value is! Map) return const {};
    return {
      for (final entry in value.entries)
        if (entry.key is String && entry.value is num)
          entry.key as String: (entry.value as num).toInt(),
    };
  }

  /// Firestore `Timestamp` to `DateTime`, in local time.
  ///
  /// Also accepts a raw `DateTime`, which is what the local cache hands back
  /// for a document written with `serverTimestamp()` before the server has
  /// acknowledged it.
  DateTime? time(String key) {
    final value = this[key];
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
