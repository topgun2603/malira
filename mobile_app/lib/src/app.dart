import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/l10n/strings.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/push_repository.dart';
import 'router.dart';
import 'state/preferences.dart';
import 'state/providers.dart';

/// Evens out the two scripts.
///
/// Noto Sans Tamil has a larger x-height and heavier strokes than Geist, so at
/// the same point size Tamil reads noticeably bigger — headlines looked shouty
/// beside their English equivalents and the tab labels ran out of room. Trimming
/// the whole scale slightly when Tamil is selected keeps the two languages
/// looking like the same newspaper, which was the point of pairing the faces in
/// the first place.
///
/// It is a scale factor rather than a per-style edit so nothing can be missed:
/// every size in the theme moves together, and the reader's own size control
/// still multiplies on top.
ThemeData _forLanguage(ThemeData theme, ReaderLanguage language) {
  if (language != ReaderLanguage.ta) return theme;
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontSizeFactor: 0.92),
  );
}

class NilgiriNewsApp extends ConsumerStatefulWidget {
  const NilgiriNewsApp({super.key});

  @override
  ConsumerState<NilgiriNewsApp> createState() => _NilgiriNewsAppState();
}

class _NilgiriNewsAppState extends ConsumerState<NilgiriNewsApp> {
  @override
  void initState() {
    super.initState();

    // After the first frame, so the permission dialog lands on a drawn app
    // rather than on a white screen, and so the router exists before a tapped
    // notification can ask it to navigate.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(pushRepositoryProvider).start(
        onOpened: (message) {
          final route = PushRepository.routeFor(message);
          // Everything the desk deep-links to is a pushed route, never a shell
          // branch root, so `push` is safe here — see the note in router.dart.
          if (route != null) ref.read(routerProvider).push(route);
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final preferences = ref.watch(preferencesProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Nilgiri News',
      debugShowCheckedModeBanner: false,
      theme: _forLanguage(AppTheme.light(), preferences.language),
      darkTheme: _forLanguage(AppTheme.dark(), preferences.language),
      themeMode: preferences.themeMode,
      routerConfig: router,
      builder: (context, child) {
        final media = MediaQuery.of(context);

        // The reader's size choice multiplies the OS setting rather than
        // replacing it. Someone who has already made their whole phone larger
        // should not have that quietly undone by this app, and the product is
        // clamped so an extreme OS setting cannot break the layout outright.
        final scale = (media.textScaler.scale(1.0) * preferences.textScale)
            .clamp(0.85, 2.0);

        return MediaQuery(
          data: media.copyWith(textScaler: TextScaler.linear(scale)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
