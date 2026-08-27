import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';

/// Nothing here, and that is fine.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.xl,
          vertical: Gap.xxl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(Gap.lg),
              decoration: BoxDecoration(
                color: brand.muted,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 26, color: brand.mutedForeground),
            ),
            const SizedBox(height: Gap.lg),
            Text(
              title,
              textAlign: TextAlign.center,
              style: context.texts.titleLarge,
            ),
            const SizedBox(height: Gap.sm),
            Text(
              body,
              textAlign: TextAlign.center,
              style: context.texts.bodyMedium,
            ),
            if (action != null) ...[const SizedBox(height: Gap.xl), action!],
          ],
        ),
      ),
    );
  }
}

/// Something went wrong reaching Firestore.
///
/// Worded for a reader, not a developer: what they can do about it, not what
/// the exception was. The underlying error still goes to the console.
class ErrorStateView extends StatelessWidget {
  const ErrorStateView({
    super.key,
    required this.title,
    required this.body,
    required this.retryLabel,
    required this.onRetry,
  });

  final String title;
  final String body;
  final String retryLabel;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.cloud_off_outlined,
      title: title,
      body: body,
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh, size: 18),
        label: Text(retryLabel),
      ),
    );
  }
}

/// The feed skeleton.
///
/// Shaped like the cards it stands in for — one lead block and a run of
/// smaller ones — so the layout does not jump when the real stories land.
class FeedSkeleton extends StatelessWidget {
  const FeedSkeleton({super.key, this.itemCount = 4});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor: brand.muted,
      highlightColor: isDark
          ? Palette.darkCard
          : Colors.white.withValues(alpha: 0.75),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Gap.page),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Block(height: 240, radius: Radii.xl),
            const SizedBox(height: Gap.md),
            _Block(height: 22, widthFactor: 0.9),
            const SizedBox(height: Gap.sm),
            _Block(height: 22, widthFactor: 0.55),
            const SizedBox(height: Gap.xxl),
            for (var index = 0; index < itemCount; index++) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Block(height: 88, width: 116, radius: Radii.lg),
                  const SizedBox(width: Gap.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Block(height: 16, widthFactor: 0.95),
                        const SizedBox(height: Gap.sm),
                        _Block(height: 16, widthFactor: 0.7),
                        const SizedBox(height: Gap.sm),
                        _Block(height: 12, widthFactor: 0.35),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Gap.xl),
            ],
          ],
        ),
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({
    required this.height,
    this.width,
    this.widthFactor,
    this.radius = Radii.sm,
  });

  final double height;
  final double? width;
  final double? widthFactor;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final block = Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );

    if (widthFactor == null) return block;
    return FractionallySizedBox(
      alignment: Alignment.centerLeft,
      widthFactor: widthFactor,
      child: block,
    );
  }
}

/// Fades and lifts a child into place.
///
/// Used to stagger a feed as it arrives. Respects the platform's reduce-motion
/// setting, which the web app also honours — an animation nobody asked for is
/// not worth making somebody ill.
class EntranceAnimation extends StatefulWidget {
  const EntranceAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  });

  final Widget child;
  final Duration delay;

  @override
  State<EntranceAnimation> createState() => _EntranceAnimationState();
}

class _EntranceAnimationState extends State<EntranceAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );

  late final Animation<double> _fade = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOut,
  );

  late final Animation<Offset> _slide =
      Tween(begin: const Offset(0, 0.045), end: Offset.zero).animate(
        CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
      );

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    if (widget.delay > Duration.zero) {
      await Future<void>.delayed(widget.delay);
      if (!mounted) return;
    }
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.disableAnimationsOf(context)) return widget.child;
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(position: _slide, child: widget.child),
    );
  }
}
