import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';

/// The Nilgiri News mark.
///
/// The same drawing as the launcher icon — a saffron rule, a heavy N, a cream
/// rule, the way a broadsheet rules off its masthead — but painted rather than
/// shipped as a bitmap, so it is crisp at any size and takes its colours from
/// the theme instead of being baked at one tint.
///
/// It used to be a landscape: layered ridgelines under a low sun. The intent
/// was the hills the district is named after, but a horizon with a sun over it
/// is precisely the Material `image` glyph, and on a home screen full of other
/// apps it read as a photo gallery. Nothing here draws a horizon. A nameplate
/// says "newspaper" at 48px in a way scenery cannot, and it is the one shape
/// on the launcher that belongs to this app alone.
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.size = 56,
    this.rounded = true,
  });

  final double size;

  /// The navy tile behind the mark. Off when the logo sits on the rail
  /// already, where a second blue square would only add an edge.
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return SizedBox(
      height: size,
      width: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(rounded ? size * 0.22 : 0),
        child: CustomPaint(
          painter: _LogoPainter(
            background: rounded ? brand.rail : Colors.transparent,
            far: Palette.lightNews,
            rule: brand.saffron,
          ),
        ),
      ),
    );
  }
}

class _LogoPainter extends CustomPainter {
  const _LogoPainter({
    required this.background,
    required this.far,
    required this.rule,
  });

  final Color background;

  /// The hill blue the navy field ramps into.
  final Color far;

  /// The saffron rule above the letter. The one below is always paper.
  final Color rule;

  /// centre-y, thickness, and whether this rule is the saffron one — identical
  /// to RULES in tool/make_logo.py, so the painted mark and the launcher icon
  /// are the same drawing. Fractions of the side, so one set of numbers serves
  /// a 20px avatar and a 512px splash alike.
  static const _rules = <(double, double, bool)>[
    (0.245, 0.048, true),
    (0.755, 0.048, false),
  ];
  static const _ruleHalfWidth = 0.30;
  static const _glyphHeight = 0.42;

  /// Palette.lightBackground — the paper the desk prints on.
  static const _paper = Color(0xFFFAF8F2);

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    if (background.a > 0) {
      canvas.drawRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [background, far],
          ).createShader(rect),
      );
    }

    for (final (centre, thickness, saffron) in _rules) {
      final half = thickness * size.width / 2;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTRB(
            size.width * (0.5 - _ruleHalfWidth),
            centre * size.height - half,
            size.width * (0.5 + _ruleHalfWidth),
            centre * size.height + half,
          ),
          Radius.circular(half),
        ),
        Paint()..color = saffron ? rule : _paper,
      );
    }

    // Laid out once at a nominal size and then scaled, so the letter's height
    // is set by its ink rather than by the font's em box — a cap-height N sits
    // low in its em, and centring the em would hang it below the rules.
    final painter = TextPainter(
      text: const TextSpan(
        text: 'N',
        style: TextStyle(
          fontFamily: 'Geist',
          fontWeight: FontWeight.w700,
          color: _paper,
          height: 1,
          fontSize: 100,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    // `height: 1` pins the line box to the font size, so the cap sits a known
    // fraction down it; 0.72 is Geist's cap height in ems.
    const capHeight = 0.72;
    final scale = (_glyphHeight * size.height) / (100 * capHeight);

    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(scale);
    // The glyph's ink is centred in the line box at (0, -50 + ascent gap); a
    // straight -height/2 is close enough once the cap height is honoured.
    painter.paint(canvas, Offset(-painter.width / 2, -painter.height / 2));
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _LogoPainter oldDelegate) =>
      oldDelegate.background != background ||
      oldDelegate.far != far ||
      oldDelegate.rule != rule;
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
