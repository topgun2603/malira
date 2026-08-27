import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/article.dart';
import 'preferences.dart';

/// Saved stories.
///
/// The whole article is written to disk, not just its id. A reader on a hill
/// road with no signal who saved a story yesterday should be able to open and
/// read it, not watch a spinner — and re-fetching by id would need exactly the
/// network they do not have.
class BookmarksNotifier extends Notifier<List<Article>> {
  static const _key = 'nilgiri-news:saved';

  /// A saved-articles cache is a convenience, not an archive. Past this the
  /// oldest saves are dropped, so the store cannot grow without bound on a
  /// device that never gets cleared.
  static const _maxSaved = 100;

  @override
  List<Article> build() {
    final raw = ref.read(sharedPreferencesProvider).getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return decoded
          .whereType<Map>()
          .map((entry) => Article.fromCache(entry.cast<String, dynamic>()))
          .toList(growable: false);
    } catch (_) {
      // A cache written by an older build that no longer parses is not worth
      // crashing over; the reader loses their saves, not the app.
      return const [];
    }
  }

  bool isSaved(String id) => state.any((article) => article.id == id);

  /// Returns true if the story ended up saved, false if it was removed — so the
  /// caller can word the confirmation without re-reading state.
  Future<bool> toggle(Article article) async {
    final saved = isSaved(article.id);
    state = saved
        ? state.where((entry) => entry.id != article.id).toList(growable: false)
        : [article, ...state].take(_maxSaved).toList(growable: false);
    await _persist();
    return !saved;
  }

  Future<void> clear() async {
    state = const [];
    await _persist();
  }

  Future<void> _persist() async {
    final payload = jsonEncode(
      state.map((article) => article.toCache()).toList(),
    );
    await ref.read(sharedPreferencesProvider).setString(_key, payload);
  }
}

final bookmarksProvider =
    NotifierProvider<BookmarksNotifier, List<Article>>(BookmarksNotifier.new);

/// Whether one specific story is saved. Separate from [bookmarksProvider] so a
/// bookmark button rebuilds when its own story is toggled and not when any
/// other one is.
final isBookmarkedProvider = Provider.family<bool, String>((ref, id) {
  return ref.watch(
    bookmarksProvider.select(
      (saved) => saved.any((article) => article.id == id),
    ),
  );
});

/// Polls this device has already answered.
///
/// Mirrors `readVotedOptions()` in the web app: a courtesy so a reader is not
/// asked twice, not a security control. The Firestore rule is what actually
/// bounds a vote, and it is deliberately open — see [EngagementRepository].
class VotedPollsNotifier extends Notifier<Map<String, String>> {
  static const _key = 'nilgiri-news:poll-votes';

  @override
  Map<String, String> build() {
    final raw = ref.read(sharedPreferencesProvider).getString(_key);
    if (raw == null || raw.isEmpty) return const {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const {};
      return {
        for (final entry in decoded.entries)
          if (entry.key is String && entry.value is String)
            entry.key as String: entry.value as String,
      };
    } catch (_) {
      return const {};
    }
  }

  String? optionFor(String pollId) => state[pollId];

  Future<void> record(String pollId, String optionId) async {
    state = {...state, pollId: optionId};
    await ref
        .read(sharedPreferencesProvider)
        .setString(_key, jsonEncode(state));
  }
}

final votedPollsProvider =
    NotifierProvider<VotedPollsNotifier, Map<String, String>>(
      VotedPollsNotifier.new,
    );
