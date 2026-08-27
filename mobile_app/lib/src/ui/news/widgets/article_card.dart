import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/l10n/strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/article.dart';
import '../../../state/preferences.dart';
import '../../../state/providers.dart';
import '../../common/app_image.dart';

/// How much room a story gets.
enum ArticleCardVariant {
  /// The lead. Full-bleed photograph with the headline laid over it — the front
  /// page of a paper, and the one place in the app where an image is allowed to
  /// dominate.
  hero,

  /// A large card inside the run, used every few stories so the feed does not
  /// read as an undifferentiated list.
  feature,

  /// The workhorse. A thumbnail and a headline, scannable at speed.
  row,

  /// Numbered list entries — most read, related stories.
  compact,
}

/// A story in the feed.
///
/// The obituary treatment is deliberate and matches the web card: a death
/// notice loses the saffron accent and the image never scales on press. A
/// community paper that animates a death notice the same way it animates a
/// match report has made a mistake that readers notice and do not forgive.
class ArticleCard extends ConsumerWidget {
  const ArticleCard({
    super.key,
    required this.article,
    this.variant = ArticleCardVariant.row,
    this.index,
  });

  final Article article;
  final ArticleCardVariant variant;

  /// Position, for the numbered compact variant.
  final int? index;

  void _open(BuildContext context) {
    // The article is handed over so the next screen can paint the headline and
    // the image immediately and only wait on the body.
    context.push('/article/${article.id}', extra: article);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final category = ref.watch(categoriesByIdProvider)[article.categoryId];
    final isObituary = category?.isObituary ?? false;

    return switch (variant) {
      ArticleCardVariant.hero => _Hero(
        article: article,
        strings: strings,
        category: category,
        isObituary: isObituary,
        onTap: () => _open(context),
      ),
      ArticleCardVariant.feature => _Feature(
        article: article,
        strings: strings,
        category: category,
        isObituary: isObituary,
        onTap: () => _open(context),
      ),
      ArticleCardVariant.row => _Row(
        article: article,
        strings: strings,
        category: category,
        isObituary: isObituary,
        onTap: () => _open(context),
      ),
      ArticleCardVariant.compact => _Compact(
        article: article,
        strings: strings,
        position: index,
        onTap: () => _open(context),
      ),
    };
  }
}

/* -------------------------------------------------------------------------- */

class _Hero extends StatelessWidget {
  const _Hero({
    required this.article,
    required this.strings,
    required this.category,
    required this.isObituary,
    required this.onTap,
  });

  final Article article;
  final Strings strings;
  final Category? category;
  final bool isObituary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final image = article.leadImage;

    return _Pressable(
      onTap: onTap,
      enableScale: !isObituary,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.xl),
        child: AspectRatio(
          // Taller than a photo crop, so the headline has room to sit inside
          // the frame rather than crowding the bottom edge.
          aspectRatio: 4 / 4.6,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Hero(
                tag: 'article-image-${article.id}',
                child: AppImage(url: image?.url, fit: BoxFit.cover),
              ),
              const ImageScrim(),
              Padding(
                padding: const EdgeInsets.all(Gap.lg),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (category != null)
                          _Pill(
                            label: strings.pick(
                              category!.name,
                              category!.nameTa,
                            ),
                            onDark: true,
                          ),
                        if (article.pinned && !isObituary) ...[
                          const SizedBox(width: Gap.sm),
                          _TopStoryFlag(label: strings.topStory),
                        ],
                        const Spacer(),
                        if (article.hasVideo)
                          const _VideoBadge(onDark: true),
                      ],
                    ),
                    const SizedBox(height: Gap.md),
                    Text(
                      strings.pick(article.title, article.titleTa),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.headlineLarge?.copyWith(
                        color: Colors.white,
                        height: 1.16,
                      ),
                    ),
                    const SizedBox(height: Gap.sm),
                    Text(
                      [
                        article.byline,
                        Dates.relative(article.publishedAt, strings),
                      ].where((part) => part.isNotEmpty).join(' · '),
                      style: context.texts.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */

class _Feature extends StatelessWidget {
  const _Feature({
    required this.article,
    required this.strings,
    required this.category,
    required this.isObituary,
    required this.onTap,
  });

  final Article article;
  final Strings strings;
  final Category? category;
  final bool isObituary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final summary = strings.pick(article.summary, article.summaryTa);

    return _Pressable(
      onTap: onTap,
      enableScale: !isObituary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Hero(
                tag: 'article-image-${article.id}',
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: AppImage(
                    url: article.leadImage?.url,
                    borderRadius: BorderRadius.circular(Radii.lg),
                  ),
                ),
              ),
              if (article.hasVideo)
                const Positioned(
                  left: Gap.md,
                  bottom: Gap.md,
                  child: _VideoBadge(onDark: true),
                ),
            ],
          ),
          const SizedBox(height: Gap.md),
          _MetaLine(
            strings: strings,
            category: category,
            article: article,
            showPin: !isObituary,
          ),
          const SizedBox(height: Gap.sm),
          Text(
            strings.pick(article.title, article.titleTa),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: context.texts.headlineSmall,
          ),
          if (summary.isNotEmpty) ...[
            const SizedBox(height: Gap.sm),
            Text(
              summary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: context.texts.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */

class _Row extends StatelessWidget {
  const _Row({
    required this.article,
    required this.strings,
    required this.category,
    required this.isObituary,
    required this.onTap,
  });

  final Article article;
  final Strings strings;
  final Category? category;
  final bool isObituary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _Pressable(
      onTap: onTap,
      enableScale: false,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _MetaLine(
                  strings: strings,
                  category: category,
                  article: article,
                  showPin: !isObituary,
                ),
                const SizedBox(height: Gap.sm),
                Text(
                  strings.pick(article.title, article.titleTa),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: context.texts.titleLarge,
                ),
              ],
            ),
          ),
          const SizedBox(width: Gap.md),
          Stack(
            children: [
              Hero(
                tag: 'article-image-${article.id}',
                child: AppImage(
                  url: article.leadImage?.url,
                  width: 108,
                  height: 92,
                  borderRadius: BorderRadius.circular(Radii.md),
                ),
              ),
              if (article.hasVideo)
                const Positioned(
                  left: 6,
                  bottom: 6,
                  child: _VideoDot(),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */

class _Compact extends StatelessWidget {
  const _Compact({
    required this.article,
    required this.strings,
    required this.position,
    required this.onTap,
  });

  final Article article;
  final Strings strings;
  final int? position;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return _Pressable(
      onTap: onTap,
      enableScale: false,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (position != null) ...[
            SizedBox(
              width: 28,
              child: Text(
                '${position! + 1}',
                style: context.texts.headlineSmall?.copyWith(
                  color: brand.saffron,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: Gap.xs),
          ] else ...[
            AppImage(
              url: article.leadImage?.url,
              width: 56,
              height: 56,
              borderRadius: BorderRadius.circular(Radii.sm),
            ),
            const SizedBox(width: Gap.md),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.pick(article.title, article.titleTa),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: context.texts.titleMedium?.copyWith(height: 1.3),
                ),
                const SizedBox(height: 2),
                Text(
                  Dates.relative(article.publishedAt, strings),
                  style: context.texts.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Shared parts                                                               */
/* -------------------------------------------------------------------------- */

/// Category, pin and timestamp on one line.
class _MetaLine extends StatelessWidget {
  const _MetaLine({
    required this.strings,
    required this.category,
    required this.article,
    required this.showPin,
  });

  final Strings strings;
  final Category? category;
  final Article article;
  final bool showPin;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Row(
      children: [
        if (category != null)
          Flexible(
            child: Text(
              strings.pick(category!.name, category!.nameTa).toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.texts.labelSmall?.copyWith(
                color: category!.isObituary
                    ? brand.mutedForeground
                    : context.scheme.primary,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.6,
              ),
            ),
          ),
        if (article.pinned && showPin) ...[
          const SizedBox(width: Gap.sm),
          Icon(Icons.push_pin, size: 12, color: brand.saffron),
        ],
        const Spacer(),
        Text(
          Dates.relative(article.publishedAt, strings),
          style: context.texts.bodySmall,
        ),
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, this.onDark = false});

  final String label;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: onDark
            ? Colors.white.withValues(alpha: 0.18)
            : context.scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(
          color: onDark ? Colors.white : context.scheme.onSecondaryContainer,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _TopStoryFlag extends StatelessWidget {
  const _TopStoryFlag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.push_pin, size: 12, color: context.brand.saffron),
        const SizedBox(width: 4),
        Text(
          label,
          style: context.texts.labelSmall?.copyWith(
            color: context.brand.saffron,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _VideoBadge extends StatelessWidget {
  const _VideoBadge({required this.onDark});

  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: onDark
            ? Colors.black.withValues(alpha: 0.55)
            : context.scheme.surface,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.play_arrow_rounded,
            size: 14,
            color: onDark ? Colors.white : context.scheme.onSurface,
          ),
          const SizedBox(width: 3),
          Text(
            'Video',
            style: context.texts.labelSmall?.copyWith(
              color: onDark ? Colors.white : context.scheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoDot extends StatelessWidget {
  const _VideoDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        shape: BoxShape.circle,
      ),
      child: const Icon(
        Icons.play_arrow_rounded,
        size: 13,
        color: Colors.white,
      ),
    );
  }
}

/// Tap feedback without a Material ripple.
///
/// The feed is cards on paper, and a rectangular ink splash bleeding to the
/// edge of a rounded photograph looks wrong. A small scale-down reads as
/// physical instead — and it is skipped entirely for obituaries.
class _Pressable extends StatefulWidget {
  const _Pressable({
    required this.child,
    required this.onTap,
    required this.enableScale,
  });

  final Widget child;
  final VoidCallback onTap;
  final bool enableScale;

  @override
  State<_Pressable> createState() => _PressableState();
}

class _PressableState extends State<_Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final scale = (_down && widget.enableScale && !reduceMotion) ? 0.985 : 1.0;

    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _down = true),
      onTapUp: (_) => setState(() => _down = false),
      onTapCancel: () => setState(() => _down = false),
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: scale,
        duration: const Duration(milliseconds: 130),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}
