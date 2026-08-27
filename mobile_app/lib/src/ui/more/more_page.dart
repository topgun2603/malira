import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../news/widgets/masthead.dart';
import '../news/widgets/text_size_sheet.dart';

/// Settings and the things that are not a tab.
class MorePage extends ConsumerWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final preferences = ref.watch(preferencesProvider);
    final notifier = ref.read(preferencesProvider.notifier);

    return Scaffold(
      appBar: PageAppBar(title: strings.more, showMenu: true),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Gap.xxl),
        children: [
          _GroupLabel(label: strings.settings),

          _Tile(
            icon: Icons.translate,
            title: strings.language,
            value: preferences.language.nativeName,
            onTap: () => _pickLanguage(context, ref),
          ),
          _Tile(
            icon: Icons.dark_mode_outlined,
            title: strings.appearance,
            value: switch (preferences.themeMode) {
              ThemeMode.light => strings.themeLight,
              ThemeMode.dark => strings.themeDark,
              ThemeMode.system => strings.themeSystem,
            },
            onTap: () => _pickTheme(context, notifier, strings),
          ),
          _Tile(
            icon: Icons.text_fields,
            title: strings.textSize,
            value: '${(preferences.textScale * 100).round()}%',
            onTap: () => showTextSizeSheet(context),
          ),

          const SizedBox(height: Gap.lg),
          _GroupLabel(label: strings.appName),

          _Tile(
            icon: Icons.search,
            title: strings.search,
            onTap: () => context.push('/search'),
          ),
          _Tile(
            icon: Icons.calendar_month_outlined,
            title: strings.archive,
            onTap: () => context.push('/archive'),
          ),
          _Tile(
            icon: Icons.info_outline,
            title: strings.about,
            onTap: () => context.push('/about'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickLanguage(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final language in ReaderLanguage.values)
              ListTile(
                // Each option is written in its own script, so a Tamil reader
                // who cannot read the English label can still find Tamil.
                title: Text(language.nativeName),
                subtitle: Text(language.englishName),
                trailing:
                    ref.read(preferencesProvider).language == language
                    ? Icon(Icons.check, color: context.scheme.primary)
                    : null,
                onTap: () {
                  ref.read(preferencesProvider.notifier).setLanguage(language);
                  Navigator.of(context).pop();
                },
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickTheme(
    BuildContext context,
    PreferencesNotifier notifier,
    Strings strings,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in <({ThemeMode mode, String label})>[
              (mode: ThemeMode.system, label: strings.themeSystem),
              (mode: ThemeMode.light, label: strings.themeLight),
              (mode: ThemeMode.dark, label: strings.themeDark),
            ])
              ListTile(
                title: Text(entry.label),
                onTap: () {
                  notifier.setThemeMode(entry.mode);
                  Navigator.of(context).pop();
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.sm),
      child: Text(
        label.toUpperCase(),
        style: context.texts.labelSmall?.copyWith(
          color: context.brand.mutedForeground,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.9,
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.value,
  });

  final IconData icon;
  final String title;
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.page,
          vertical: Gap.md,
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: brand.mutedForeground),
            const SizedBox(width: Gap.md),
            Expanded(child: Text(title, style: context.texts.bodyLarge)),
            if (value != null)
              Text(value!, style: context.texts.bodyMedium),
            const SizedBox(width: Gap.sm),
            Icon(Icons.chevron_right, size: 20, color: brand.mutedForeground),
          ],
        ),
      ),
    );
  }
}
