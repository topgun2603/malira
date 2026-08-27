import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/palette.dart';

/// Every remote image in the app goes through here.
///
/// One place decides the placeholder, the fade, the cache and what a broken
/// image looks like — so a story with a dead image URL degrades into a calm
/// tinted block rather than a black rectangle with an error glyph in the middle
/// of the feed.
class AppImage extends StatelessWidget {
  const AppImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.height,
    this.width,
  });

  final String? url;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final double? height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.zero;
    final address = url;

    Widget content;
    if (address == null || address.isEmpty) {
      content = _Placeholder(showGlyph: true);
    } else {
      content = CachedNetworkImage(
        imageUrl: address,
        fit: fit,
        height: height,
        width: width,
        // A short fade reads as the image settling rather than as a flash.
        fadeInDuration: const Duration(milliseconds: 220),
        placeholder: (context, _) => _Placeholder(showGlyph: false),
        errorWidget: (context, _, _) => _Placeholder(showGlyph: true),
      );
    }

    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(height: height, width: width, child: content),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.showGlyph});

  final bool showGlyph;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return ColoredBox(
      color: brand.muted,
      child: showGlyph
          ? Center(
              child: Icon(
                Icons.landscape_outlined,
                size: 28,
                color: brand.mutedForeground.withValues(alpha: 0.5),
              ),
            )
          : const SizedBox.expand(),
    );
  }
}

/// A scrim for text laid over a photograph.
///
/// Bottom-weighted and opaque enough that a white headline stays legible over a
/// bright sky, which is most photographs taken in the Nilgiris.
class ImageScrim extends StatelessWidget {
  const ImageScrim({super.key, this.strength = 0.82});

  final double strength;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: const [0.0, 0.45, 1.0],
          colors: [
            Colors.transparent,
            Colors.black.withValues(alpha: strength * 0.35),
            Colors.black.withValues(alpha: strength),
          ],
        ),
      ),
      child: const SizedBox.expand(),
    );
  }
}
