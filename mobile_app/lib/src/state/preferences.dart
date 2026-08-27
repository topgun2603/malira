import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/l10n/strings.dart';

/// Everything the reader has chosen about how the app looks and reads.
@immutable
class AppPreferences {
  const AppPreferences({
    this.language = ReaderLanguage.en,
    this.themeMode = ThemeMode.system,
    this.textScale = 1.0,
    this.onboarded = false,
    this.announcementsSeenAt,
  });

  final ReaderLanguage language;
  final ThemeMode themeMode;

  /// Multiplies the type scale. The readership skews old and the association
  /// asked for a size control rather than relying on the OS setting, which many
  /// readers will never have found.
  final double textScale;

  /// False until the reader has been through the welcome screens once.
  ///
  /// Stored rather than inferred: "have they used the app before" has no other
  /// reliable signal, and showing the welcome twice is worse than not showing
  /// it at all.
  final bool onboarded;

  /// When the reader last opened the notifications screen.
  ///
  /// The unread count is derived from this rather than from a read flag on each
  /// message: the announcements live in a collection the desk owns and readers
  /// cannot write to, so there is nowhere to record a per-reader read receipt
  /// without giving every device write access to it. A single local timestamp
  /// gives the same badge with none of that.
  final DateTime? announcementsSeenAt;

  /// The steps the size control offers. Deliberately coarse: four choices a
  /// reader can tell apart, not a slider they have to fiddle with.
  static const scaleSteps = <double>[1.0, 1.15, 1.3, 1.5];

  AppPreferences copyWith({
    ReaderLanguage? language,
    ThemeMode? themeMode,
    double? textScale,
    bool? onboarded,
    DateTime? announcementsSeenAt,
  }) {
    return AppPreferences(
      language: language ?? this.language,
      themeMode: themeMode ?? this.themeMode,
      textScale: textScale ?? this.textScale,
      onboarded: onboarded ?? this.onboarded,
      announcementsSeenAt: announcementsSeenAt ?? this.announcementsSeenAt,
    );
  }
}

/// Set in `main()` once SharedPreferences has loaded.
///
/// Reading preferences synchronously is what keeps the app from painting in
/// English and light mode for one frame before switching to the reader's actual
/// choice — the same reason the web provider uses a lazy initialiser rather
/// than an effect.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in main().',
  ),
);

class PreferencesNotifier extends Notifier<AppPreferences> {
  static const _langKey = 'nilgiri-news:lang';
  static const _themeKey = 'nilgiri-news:theme';
  static const _scaleKey = 'nilgiri-news:text-scale';
  static const _onboardedKey = 'nilgiri-news:onboarded';
  static const _seenKey = 'nilgiri-news:announcements-seen';

  SharedPreferences get _store => ref.read(sharedPreferencesProvider);

  @override
  AppPreferences build() {
    return AppPreferences(
      // Same storage key as the web reader, deliberately: on Android the two
      // do not share storage, but keeping the vocabulary identical means one
      // less thing to reconcile if a web view is ever embedded.
      language: ReaderLanguage.fromCode(_store.getString(_langKey)),
      themeMode: switch (_store.getString(_themeKey)) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      },
      textScale: _store.getDouble(_scaleKey) ?? 1.0,
      onboarded: _store.getBool(_onboardedKey) ?? false,
      announcementsSeenAt: switch (_store.getInt(_seenKey)) {
        final int millis => DateTime.fromMillisecondsSinceEpoch(millis),
        null => null,
      },
    );
  }

  Future<void> setLanguage(ReaderLanguage language) async {
    state = state.copyWith(language: language);
    await _store.setString(_langKey, language.code);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    await _store.setString(_themeKey, mode.name);
  }

  Future<void> setTextScale(double scale) async {
    state = state.copyWith(textScale: scale);
    await _store.setDouble(_scaleKey, scale);
  }

  Future<void> markAnnouncementsSeen() async {
    final now = DateTime.now();
    state = state.copyWith(announcementsSeenAt: now);
    await _store.setInt(_seenKey, now.millisecondsSinceEpoch);
  }

  Future<void> completeOnboarding() async {
    state = state.copyWith(onboarded: true);
    await _store.setBool(_onboardedKey, true);
  }
}

final preferencesProvider =
    NotifierProvider<PreferencesNotifier, AppPreferences>(
      PreferencesNotifier.new,
    );

/// The string table for the currently selected language.
final stringsProvider = Provider<Strings>((ref) {
  return Strings(ref.watch(preferencesProvider.select((p) => p.language)));
});
