import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../state/preferences.dart';

/// The reader's text size control.
///
/// The association asked for this explicitly: the readership skews old, and
/// most of them will never have found the Android font-size setting. Four
/// steps, each shown at the size it produces, with a live sample above — so the
/// choice is made by looking rather than by reading a number.
Future<void> showTextSizeSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    builder: (context) => const _TextSizeSheet(),
  );
}

class _TextSizeSheet extends ConsumerWidget {
  const _TextSizeSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final current = ref.watch(
      preferencesProvider.select((preferences) => preferences.textScale),
    );
    final brand = context.brand;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Gap.page, 0, Gap.page, Gap.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(strings.textSize, style: context.texts.titleLarge),
            const SizedBox(height: Gap.lg),

            // A sample of real running text, so the effect on a paragraph is
            // visible rather than the effect on one word.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: brand.muted,
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              child: Text(
                strings.isTamil
                    ? 'நீலகிரி மாவட்டத்தின் செய்திகள் இங்கே இவ்வாறு தோன்றும்.'
                    : 'A story from the district will read like this.',
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
                      child: _StepButton(
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
        ),
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
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

    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? scheme.primary : brand.muted,
            borderRadius: BorderRadius.circular(Radii.md),
          ),
          child: Text(
            'A',
            // Deliberately not scaled by MediaQuery: this button has to show
            // the size it sets, not the size currently in force, or every
            // option would look identical.
            textScaler: TextScaler.noScaling,
            style: TextStyle(
              fontSize: 13 * scale * 1.15,
              fontWeight: FontWeight.w600,
              color: selected ? scheme.onPrimary : brand.mutedForeground,
            ),
          ),
        ),
      ),
    );
  }
}
