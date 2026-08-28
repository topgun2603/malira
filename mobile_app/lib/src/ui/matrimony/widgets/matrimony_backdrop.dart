import 'package:flutter/material.dart';

import '../../../core/theme/palette.dart';

/// The matrimony sign-in artwork, behind whatever is put on top of it.
///
/// A Badaga couple looking out over the tea terraces — at first light in the
/// light theme, at dusk in the dark one. Two paintings rather than one image
/// under a filter: the dark version has its own sky and its own horizon line,
/// and tinting the light one would have produced neither.
///
/// The composition matters to the layout above it. Roughly the top three fifths
/// of both files are deliberately empty — cream, or near-black — and the hills
/// and the couple occupy the bottom two. That empty band is where the wordmark
/// and the buttons go, which is why this widget exposes [contentFraction]
/// rather than leaving callers to guess where the horizon falls.
class MatrimonyBackdrop extends StatelessWidget {
  const MatrimonyBackdrop({super.key, required this.child});

  final Widget child;

  /// How much of the height the content may use.
  ///
  /// Lower than the artwork's own clear band, because `BoxFit.cover` on a
  /// screen wider than 852x1846 crops the top — the very sky the content needs.
  /// Measured on a 1080x2412 phone, where the horizon lands near 0.52 rather
  /// than the 0.60 the file is composed at.
  static const contentFraction = 0.50;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final ground = context.backdropGround;

    return DecoratedBox(
      // Painted under the image so a screen taller than the artwork's 852x1846
      // extends the sky rather than showing a seam.
      decoration: BoxDecoration(color: ground),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            dark
                ? 'assets/matrimony/login_dark.webp'
                : 'assets/matrimony/login_light.webp',
            fit: BoxFit.cover,
            // Anchored to the bottom: on a screen with a different aspect the
            // crop should eat empty sky, never the couple.
            alignment: Alignment.bottomCenter,
          ),
          // Insurance for the devices this was not measured on: the ground
          // colour, faded out by the time it reaches the hills. In the light
          // theme it simply extends the cream, so it costs nothing visually
          // and guarantees that copy near the fold still reads.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  ground,
                  ground.withValues(alpha: 0.92),
                  ground.withValues(alpha: 0.0),
                ],
                stops: const [0.0, contentFraction * 0.72, contentFraction + 0.06],
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

/// Ink that reads on the artwork: near-black on the cream, white on the dusk.
///
/// Not the theme's `onSurface`, because the backdrop is not the theme's
/// surface — it is a painting, and in light mode it stays cream whatever the
/// system is doing.
extension MatrimonyBackdropInk on BuildContext {
  /// The colour the painting is grounded in: cream at first light, near-black
  /// at dusk.
  ///
  /// Exposed because content laid over the artwork carries its own scrim in
  /// this colour and fades out of it. A scrim in any other colour would show a
  /// seam where it meets the sky.
  Color get backdropGround =>
      Theme.of(this).brightness == Brightness.dark
          ? const Color(0xFF0B0709)
          : const Color(0xFFF6EFE3);

  Color get backdropInk =>
      Theme.of(this).brightness == Brightness.dark
          ? Colors.white
          : const Color(0xFF2A1119);

  Color get backdropMutedInk => backdropInk.withValues(alpha: 0.68);

  /// The button colour: deep rose on the cream, the lighter rose on the dusk.
  ///
  /// This is `brand.matrimony`, which already swaps per theme, so the CTA keeps
  /// its contrast against two very different paintings instead of holding one
  /// hex and going muddy on one of them.
  Color get backdropAccent => brand.matrimony;
}
