import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/article.dart';
import '../../../data/repositories/engagement_repository.dart';
import '../../../state/preferences.dart';
import '../../../state/providers.dart';
import '../../common/app_image.dart';

/// A curated run of stories, in the editor's order.
///
/// Not a query and never re-sorted — an editor picked these, in this sequence,
/// which is the entire difference between a carousel and a feed.
class StoryCarouselSlot extends ConsumerStatefulWidget {
  const StoryCarouselSlot({super.key, required this.slot});

  final FeedSlot slot;

  @override
  ConsumerState<StoryCarouselSlot> createState() => _StoryCarouselSlotState();
}

class _StoryCarouselSlotState extends ConsumerState<StoryCarouselSlot> {
  final _controller = PageController(viewportFraction: 0.86);
  Timer? _autoplay;
  int _page = 0;
  int _count = 0;

  @override
  void dispose() {
    _autoplay?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _syncAutoplay({required bool enabled, required int seconds}) {
    if (!enabled || _count < 2) {
      _autoplay?.cancel();
      _autoplay = null;
      return;
    }
    if (_autoplay != null) return;

    _autoplay = Timer.periodic(Duration(seconds: seconds.clamp(3, 30)), (_) {
      if (!mounted || !_controller.hasClients) return;
      final next = (_page + 1) % _count;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final carousel = ref.watch(carouselForSlotProvider(widget.slot)).value;
    final articles =
        ref.watch(carouselArticlesProvider(widget.slot)).value ??
        const <Article>[];

    if (carousel == null || articles.isEmpty) return const SizedBox.shrink();

    _count = articles.length;
    _syncAutoplay(
      enabled: carousel.autoplay,
      seconds: carousel.intervalSeconds,
    );

    final strings = ref.watch(stringsProvider);
    final heading = strings.pick(carousel.title, carousel.titleTa);

    return Padding(
      padding: const EdgeInsets.only(top: Gap.lg, bottom: Gap.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (heading.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(Gap.page, 0, Gap.page, Gap.md),
              child: Row(
                children: [
                  Container(
                    width: 3,
                    height: 16,
                    decoration: BoxDecoration(
                      color: context.brand.saffron,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: Gap.sm),
                  Expanded(
                    child: Text(heading, style: context.texts.titleMedium),
                  ),
                ],
              ),
            ),
          SizedBox(
            height: 210,
            child: PageView.builder(
              controller: _controller,
              itemCount: articles.length,
              onPageChanged: (page) => setState(() => _page = page),
              itemBuilder: (context, index) {
                final article = articles[index];
                return Padding(
                  padding: EdgeInsets.only(
                    left: index == 0 ? Gap.page : Gap.sm,
                    right: index == articles.length - 1 ? Gap.page : Gap.sm,
                  ),
                  child: _CarouselCard(article: article),
                );
              },
            ),
          ),
          if (articles.length > 1) ...[
            const SizedBox(height: Gap.md),
            Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var index = 0; index < articles.length; index++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      height: 6,
                      width: index == _page ? 18 : 6,
                      decoration: BoxDecoration(
                        color: index == _page
                            ? context.scheme.primary
                            : context.brand.border,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CarouselCard extends ConsumerWidget {
  const _CarouselCard({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);

    return GestureDetector(
      onTap: () => context.push('/article/${article.id}', extra: article),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.lg),
        child: Stack(
          fit: StackFit.expand,
          children: [
            AppImage(url: article.leadImage?.url),
            const ImageScrim(strength: 0.78),
            Padding(
              padding: const EdgeInsets.all(Gap.md),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.pick(article.title, article.titleTa),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: context.texts.titleLarge?.copyWith(
                      color: Colors.white,
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
