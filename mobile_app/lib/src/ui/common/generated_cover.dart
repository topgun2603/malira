import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import 'app_image.dart';

/// A cover image, or a generated stand-in when there is not one.
///
/// Playlists frequently have no artwork and village events rarely have a
/// poster. Rendering those as grey rectangles makes a screen look broken; the
/// same screen with tinted, lettered cards looks considered. The tint is
/// derived from the item's own id, so it is stable across rebuilds and across
/// devices — the Devotional playlist is the same green every time, which over a
/// few visits becomes a way of recognising it.
class GeneratedCover extends StatelessWidget {
  const GeneratedCover({
    super.key,
    required this.seed,
    required this.label,
    this.imageUrl,
    this.height,
    this.width,
    this.radius = Radii.lg,
    this.icon,
    this.plain = false,
  });

  /// Whatever identifies the item — a document id is ideal, a name will do.
  final String seed;

  /// Shown when there is no image. Only the first character is drawn.
  final String label;

  final String? imageUrl;
  final double? height;
  final double? width;
  final double radius;

  /// Drawn under the letter, when the kind of thing is worth signalling.
  final IconData? icon;

  /// Suppresses the letter and the icon, leaving only the gradient.
  ///
  /// Set when the cover is a backdrop for text that is about to be drawn over
  /// it: a hero card already carries the title, and a giant initial showing
  /// through the headline reads as a rendering fault rather than as artwork.
  final bool plain;

  /// Two tints from the palette, chosen by the seed.
  ///
  /// The second is offset from the first so the pair is always a gradient
  /// rather than a flat block, and never the same colour twice.
  static (Color, Color) tintsFor(String seed, Brightness brightness) {
    final palette = brightness == Brightness.dark
        ? Palette.darkCovers
        : Palette.lightCovers;

    // A small stable string hash. Dart's `hashCode` is not guaranteed stable
    // across runs for strings, so it cannot be used for something a reader is
    // meant to recognise from one session to the next.
    var hash = 0;
    for (final unit in seed.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }

    final first = palette[hash % palette.length];
    final second = palette[(hash ~/ palette.length + 2) % palette.length];
    return (first, identical(first, second) ? palette.first : second);
  }

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    if (url != null && url.isNotEmpty) {
      return AppImage(
        url: url,
        height: height,
        width: width,
        borderRadius: BorderRadius.circular(radius),
      );
    }

    final (from, to) = tintsFor(seed, Theme.of(context).brightness);

    return Container(
      height: height,
      width: width,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [from, to],
        ),
      ),
      child: plain
          ? const SizedBox.expand()
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(
                    icon,
                    color: Colors.white.withValues(alpha: 0.85),
                    size: 20,
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  label.isEmpty ? '·' : label.characters.first.toUpperCase(),
                  style: context.texts.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
    );
  }
}
