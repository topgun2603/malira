import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../common/app_logo.dart';

/// First run.
///
/// Four screens, in an order chosen for this readership rather than for a
/// product tour:
///
/// 1. **Language, before anything else.** Every screen after this one is in the
///    language chosen here, so asking third would mean three screens somebody
///    could not read. Both options are written in their own script, so the
///    choice does not require reading the other one.
/// 2. **What the paper carries** — the reason to keep the app.
/// 3. **What needs an account** — said plainly and early, so matrimony is not a
///    login wall discovered later.
/// 4. **Text size.** The audience skews old and most will never have found the
///    Android setting. Asking once, with a real paragraph to judge it on, is
///    worth more than a settings row nobody opens.
///
/// It can be skipped from any page. Somebody who wants the news now should get
/// the news now.
class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final _controller = PageController();
  int _page = 0;

  static const _pages = 4;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await ref.read(preferencesProvider.notifier).completeOnboarding();
    if (mounted) context.go('/matrimony');
  }

  void _next() {
    if (_page >= _pages - 1) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Skip, always reachable. Language is the one page where it would
            // leave the app in a state the reader did not choose, so it waits.
            SizedBox(
              height: 48,
              child: Align(
                alignment: Alignment.centerRight,
                child: AnimatedOpacity(
                  opacity: _page == 0 ? 0 : 1,
                  duration: const Duration(milliseconds: 200),
                  child: TextButton(
                    onPressed: _page == 0 ? null : _finish,
                    child: Text(strings.skip),
                  ),
                ),
              ),
            ),

            Expanded(
              child: PageView(
                controller: _controller,
                onPageChanged: (page) => setState(() => _page = page),
                children: [
                  _LanguagePage(strings: strings, onChosen: _next),
                  _StoryPage(
                    icon: Icons.article_outlined,
                    title: strings.onboardNewsTitle,
                    body: strings.onboardNewsBody,
                    bullets: [
                      strings.onboardNewsBullet1,
                      strings.onboardNewsBullet2,
                      strings.onboardNewsBullet3,
                    ],
                    accent: brand.news,
                  ),
                  _StoryPage(
                    icon: Icons.favorite_outline,
                    title: strings.onboardMatrimonyTitle,
                    body: strings.onboardMatrimonyBody,
                    bullets: [
                      strings.onboardMatrimonyBullet1,
                      strings.onboardMatrimonyBullet2,
                      strings.onboardMatrimonyBullet3,
                    ],
                    accent: brand.matrimony,
                  ),
                  _TextSizePage(strings: strings),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(
                Gap.page,
                Gap.md,
                Gap.page,
                Gap.lg,
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var index = 0; index < _pages; index++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          height: 6,
                          width: index == _page ? 20 : 6,
                          decoration: BoxDecoration(
                            color: index == _page
                                ? context.scheme.primary
                                : brand.border,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: Gap.lg),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _next,
                      child: Text(
                        _page == _pages - 1
                            ? strings.startReading
                            : strings.next,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Page one: the language, in both scripts.
class _LanguagePage extends ConsumerWidget {
  const _LanguagePage({required this.strings, required this.onChosen});

  final Strings strings;
  final VoidCallback onChosen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(
      preferencesProvider.select((preferences) => preferences.language),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.xl),
      children: [
        Center(child: AppLogo(size: 84)),
        const SizedBox(height: Gap.xl),
        Text(
          'MALIRA',
          textAlign: TextAlign.center,
          style: context.texts.displaySmall,
        ),
        const SizedBox(height: 2),
        Text(
          'மலிரா',
          textAlign: TextAlign.center,
          style: context.texts.titleLarge?.copyWith(
            color: context.brand.mutedForeground,
          ),
        ),

        const SizedBox(height: Gap.xxl),

        // Both labels are written in their own script and never translated, so
        // the choice can be made without being able to read the other one.
        for (final language in ReaderLanguage.values) ...[
          _LanguageOption(
            native: language.nativeName,
            english: language.englishName,
            selected: current == language,
            onTap: () async {
              await ref
                  .read(preferencesProvider.notifier)
                  .setLanguage(language);
              onChosen();
            },
          ),
          const SizedBox(height: Gap.md),
        ],

        const SizedBox(height: Gap.sm),
        Text(
          'You can change this at any time. / எப்போது வேண்டுமானாலும் மாற்றலாம்.',
          textAlign: TextAlign.center,
          style: context.texts.bodySmall,
        ),
      ],
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.native,
    required this.english,
    required this.selected,
    required this.onTap,
  });

  final String native;
  final String english;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final brand = context.brand;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.lg,
          vertical: Gap.lg,
        ),
        decoration: BoxDecoration(
          color: selected
              ? scheme.primary.withValues(alpha: 0.08)
              : scheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(
            color: selected ? scheme.primary : brand.border,
            width: selected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(native, style: context.texts.titleLarge),
                  Text(english, style: context.texts.bodySmall),
                ],
              ),
            ),
            Icon(
              selected ? Icons.check_circle : Icons.chevron_right,
              color: selected ? scheme.primary : brand.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}

/// A feature page: one idea, three supporting lines.
class _StoryPage extends StatelessWidget {
  const _StoryPage({
    required this.icon,
    required this.title,
    required this.body,
    required this.bullets,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String body;
  final List<String> bullets;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.xl),
      children: [
        Center(
          child: Container(
            height: 92,
            width: 92,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 40, color: accent),
          ),
        ),
        const SizedBox(height: Gap.xl),
        Text(
          title,
          textAlign: TextAlign.center,
          style: context.texts.headlineMedium,
        ),
        const SizedBox(height: Gap.md),
        Text(
          body,
          textAlign: TextAlign.center,
          style: context.texts.bodyMedium,
        ),
        const SizedBox(height: Gap.xxl),
        for (final line in bullets)
          Padding(
            padding: const EdgeInsets.only(bottom: Gap.lg),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Icon(Icons.check, size: 18, color: accent),
                ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: Text(line, style: context.texts.bodyLarge),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Page four: the size everything will be read at.
class _TextSizePage extends ConsumerWidget {
  const _TextSizePage({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(
      preferencesProvider.select((preferences) => preferences.textScale),
    );
    final brand = context.brand;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.xl),
      children: [
        Center(
          child: Container(
            height: 92,
            width: 92,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: brand.saffron.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.text_fields, size: 40, color: brand.saffron),
          ),
        ),
        const SizedBox(height: Gap.xl),
        Text(
          strings.onboardSizeTitle,
          textAlign: TextAlign.center,
          style: context.texts.headlineMedium,
        ),
        const SizedBox(height: Gap.md),
        Text(
          strings.onboardSizeBody,
          textAlign: TextAlign.center,
          style: context.texts.bodyMedium,
        ),

        const SizedBox(height: Gap.xl),

        // A real paragraph, not one word: the choice is about reading, and a
        // single letter tells you nothing about a column of text.
        Container(
          padding: const EdgeInsets.all(Gap.lg),
          decoration: BoxDecoration(
            color: brand.muted,
            borderRadius: BorderRadius.circular(Radii.lg),
          ),
          child: Text(
            strings.onboardSizeSample,
            style: context.texts.bodyLarge,
          ),
        ),

        const SizedBox(height: Gap.lg),

        Row(
          children: [
            for (final step in AppPreferences.scaleSteps)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: Gap.sm),
                  child: _SizeButton(
                    scale: step,
                    selected: (current - step).abs() < 0.001,
                    onTap: () => ref
                        .read(preferencesProvider.notifier)
                        .setTextScale(step),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _SizeButton extends StatelessWidget {
  const _SizeButton({
    required this.scale,
    required this.selected,
    required this.onTap,
  });

  final double scale;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final brand = context.brand;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 58,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? scheme.primary : brand.muted,
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        child: Text(
          'A',
          // Not scaled by MediaQuery: this button has to show the size it
          // sets, not the size currently in force, or every option would look
          // identical.
          textScaler: TextScaler.noScaling,
          style: TextStyle(
            fontSize: 13 * scale * 1.2,
            fontWeight: FontWeight.w600,
            color: selected ? scheme.onPrimary : brand.mutedForeground,
          ),
        ),
      ),
    );
  }
}
