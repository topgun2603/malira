import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/article.dart';
import '../../data/repositories/engagement_repository.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/states.dart';
import '../shell/root_shell.dart';
import 'notifications_page.dart';
import 'widgets/ad_slot.dart';
import 'widgets/article_card.dart';
import 'widgets/category_rail.dart';
import 'widgets/masthead.dart';
import 'widgets/poll_card.dart';
import 'widgets/story_carousel.dart';

/// The front page.
///
/// Composition, in order: masthead, category rail, lead story, curated
/// carousel, the run of stories with one ad and one poll folded into it, then
/// most-read. That is the same running order as the web reader, which matters
/// more than it sounds — the desk pins and curates for a layout, and if the two
/// clients disagree about where a pinned story lands, the desk cannot preview
/// its own front page.
class FeedPage extends ConsumerStatefulWidget {
  const FeedPage({super.key});

  @override
  ConsumerState<FeedPage> createState() => _FeedPageState();
}

class _FeedPageState extends ConsumerState<FeedPage> {
  final _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  @override
  void dispose() {
    _controller.removeListener(_onScroll);
    _controller.dispose();
    super.dispose();
  }

  /// Fetch the next page before the reader hits the bottom, so the feed feels
  /// continuous rather than stopping to load.
  void _onScroll() {
    if (!_controller.hasClients) return;
    final position = _controller.position;
    if (position.pixels >= position.maxScrollExtent - 900) {
      ref.read(feedProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final feed = ref.watch(feedProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(mostReadProvider);
          ref.invalidate(carouselArticlesProvider);
          await ref.read(feedProvider.notifier).refresh();
        },
        child: CustomScrollView(
          controller: _controller,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const FeedMasthead(),
            const CategoryRailHeader(),
            ...switch (feed) {
              AsyncLoading() => [
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(top: Gap.xl),
                    child: FeedSkeleton(),
                  ),
                ),
              ],
              // The exception itself is a developer concern; the reader gets
              // told what they can do about it.
              AsyncError() => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: ErrorStateView(
                    title: strings.offlineTitle,
                    body: strings.offlineBody,
                    retryLabel: strings.retry,
                    onRetry: () => ref.invalidate(feedProvider),
                  ),
                ),
              ],
              AsyncData(:final value) => _content(value, strings),
            },
          ],
        ),
      ),
    );
  }

  List<Widget> _content(FeedState feed, Strings strings) {
    if (feed.articles.isEmpty) {
      final filtered = ref.watch(selectedCategoryProvider) != 'all';
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: Icons.newspaper_outlined,
            title: filtered ? strings.noStoriesInCategory : strings.noStories,
            body: strings.noStoriesBody,
          ),
        ),
      ];
    }

    final hero = feed.articles.first;
    final rest = feed.articles.skip(1).toList(growable: false);

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, 0),
        sliver: SliverToBoxAdapter(
          child: EntranceAnimation(
            child: ArticleCard(
              article: hero,
              variant: ArticleCardVariant.hero,
            ),
          ),
        ),
      ),

      const SliverToBoxAdapter(child: SizedBox(height: Gap.xl)),
      const SliverToBoxAdapter(child: AdSlot(slot: FeedSlot.homeTop)),
      const SliverToBoxAdapter(child: StoryCarouselSlot(slot: FeedSlot.homeTop)),

      if (rest.isNotEmpty) ...[
        SliverToBoxAdapter(
          child: _SectionHeader(label: strings.moreStories),
        ),
        _StoryRun(articles: rest),
      ],

      SliverToBoxAdapter(child: _LoadMoreFooter(feed: feed, strings: strings)),

      const SliverToBoxAdapter(child: PollCard(surface: 'sidebar')),

      SliverToBoxAdapter(child: _MostRead(strings: strings)),

      const SliverToBoxAdapter(child: SizedBox(height: Gap.xxl)),
    ];
  }
}

/// The run of stories under the lead.
///
/// Mostly compact rows, with a large card every fifth story and an in-feed ad
/// after the fourth. An unbroken column of identical rows is efficient and
/// completely charmless; the rhythm is what makes it read like a paper.
class _StoryRun extends StatelessWidget {
  const _StoryRun({required this.articles});

  final List<Article> articles;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];

    for (var index = 0; index < articles.length; index++) {
      final article = articles[index];
      final isFeature = index > 0 && index % 5 == 0;

      children.add(
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Gap.page),
          child: ArticleCard(
            article: article,
            variant: isFeature
                ? ArticleCardVariant.feature
                : ArticleCardVariant.row,
          ),
        ),
      );

      final isLast = index == articles.length - 1;
      if (!isLast) {
        children.add(
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: Gap.page,
              vertical: Gap.lg,
            ),
            child: Divider(color: context.brand.border, height: 1),
          ),
        );
      }

      if (index == 3) {
        children.add(const AdSlot(slot: FeedSlot.homeFeed));
      }
    }

    return SliverList.list(children: children);
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.lg),
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
            child: Text(
              label,
              style: context.texts.titleMedium?.copyWith(
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadMoreFooter extends ConsumerWidget {
  const _LoadMoreFooter({required this.feed, required this.strings});

  final FeedState feed;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!feed.hasMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.page,
          vertical: Gap.xl,
        ),
        child: Center(
          child: Text(strings.endOfFeed, style: context.texts.bodySmall),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Gap.page,
        vertical: Gap.xl,
      ),
      child: Center(
        child: feed.loadingMore
            ? const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.2),
              )
            : OutlinedButton(
                onPressed: () => ref.read(feedProvider.notifier).loadMore(),
                child: Text(strings.loadMore),
              ),
      ),
    );
  }
}

class _MostRead extends ConsumerWidget {
  const _MostRead({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mostRead = ref.watch(mostReadProvider).value ?? const [];
    if (mostRead.isEmpty) return const SizedBox.shrink();

    final brand = context.brand;

    return Container(
      margin: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, 0),
      padding: const EdgeInsets.all(Gap.lg),
      decoration: BoxDecoration(
        color: brand.muted,
        borderRadius: BorderRadius.circular(Radii.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.trending_up, size: 18, color: brand.saffron),
              const SizedBox(width: Gap.sm),
              Text(strings.mostRead, style: context.texts.titleMedium),
            ],
          ),
          const SizedBox(height: Gap.lg),
          for (var index = 0; index < mostRead.length; index++) ...[
            ArticleCard(
              article: mostRead[index],
              variant: ArticleCardVariant.compact,
              index: index,
            ),
            if (index != mostRead.length - 1)
              const SizedBox(height: Gap.lg),
          ],
        ],
      ),
    );
  }
}

/// The masthead sliver.
///
/// Kept in this file rather than the widgets folder because it is the front
/// page's own furniture — nothing else in the app has a use for it.
class FeedMasthead extends ConsumerWidget {
  const FeedMasthead({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return MastheadSliver(
      eyebrow: strings.todayFromDistrict,
      title: strings.appName,
      dateLine: Dates.short(DateTime.now()),
      onSearch: () => context.push('/search'),
      actions: const [NotificationBell(color: Colors.white)],
      trailing: const LanguageToggle(onDark: true),
    );
  }
}
