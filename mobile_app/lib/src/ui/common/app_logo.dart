import 'package:flutter/material.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';

/// The Badaga Matrimony mark.
///
/// The supplied medallion, not a drawing. It used to be painted here — a
/// nameplate built from rules and initials — which meant the app and the
/// launcher were two drawings that had to be kept in step by hand. Both now
/// come from `assets/brand/logo.png`: the widget shows it directly and
/// `tool/make_logo.py` generates every launcher icon from the same file, so
/// they cannot disagree.
///
/// The artwork is already circular and carries its own alpha outside the gold
/// ring, so it needs no tile of its own. [rounded] paints the ring's blue
/// behind it for the places that want a solid app-icon-shaped block.
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.size = 56,
    this.rounded = true,
  });

  final double size;

  /// The blue tile behind the medallion. Off when the mark sits on artwork or
  /// on the rail already, where a second block would only add an edge.
  final bool rounded;

  /// Sampled from the medallion's own ring, so ground and artwork cannot drift.
  static const ground = Color(0xFF001854);

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      'assets/brand/logo.png',
      height: size,
      width: size,
      // The medallion is detailed; letting it scale smoothly matters more here
      // than the few microseconds saved by nearest-neighbour.
      filterQuality: FilterQuality.medium,
    );

    if (!rounded) return SizedBox(height: size, width: size, child: image);

    return SizedBox(
      height: size,
      width: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.22),
        child: ColoredBox(color: ground, child: image),
      ),
    );
  }
}

/// The mark next to the wordmark, for headers and the onboarding.
class AppLogoLockup extends StatelessWidget {
  const AppLogoLockup({
    super.key,
    required this.title,
    this.subtitle,
    this.size = 44,
    this.onDark = false,
  });

  final String title;
  final String? subtitle;
  final double size;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final onSurface = onDark ? Colors.white : context.scheme.onSurface;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppLogo(size: size),
        const SizedBox(width: Gap.md),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: context.texts.titleLarge?.copyWith(color: onSurface),
            ),
            if (subtitle != null)
              Text(
                subtitle!,
                style: context.texts.bodySmall?.copyWith(
                  color: onDark
                      ? Colors.white.withValues(alpha: 0.72)
                      : context.brand.mutedForeground,
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// The name, set as the two lines it is actually read in.
///
/// "Badaga" carries the identity and takes the gold and the size; "Matrimony"
/// says what the thing is and sits under it, quieter and letterspaced so it
/// reads as a classification rather than a second name.
///
/// One [Text.rich] rather than two stacked [Text]s: the pair is one phrase to a
/// screen reader, and a hard newline inside a single block keeps the break
/// where it was drawn no matter how far the reader has pushed the text size.
class AppWordmark extends StatelessWidget {
  const AppWordmark({
    super.key,
    required this.strings,
    this.color,
    this.textAlign = TextAlign.center,
  });

  final Strings strings;

  /// Colour of the second line. The first is always the gold, which is the
  /// point of the lockup.
  final Color? color;

  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: strings.brandName,
            style: context.texts.displayMedium?.copyWith(
              color: context.brand.gold,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
              height: 1.02,
            ),
          ),
          const TextSpan(text: '\n'),
          TextSpan(
            text: strings.brandKind,
            style: context.texts.titleLarge?.copyWith(
              color: color ?? context.scheme.onSurface,
              fontWeight: FontWeight.w600,
              letterSpacing: 4,
              height: 1.4,
            ),
          ),
        ],
      ),
      textAlign: textAlign,
    );
  }
}
