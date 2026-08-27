import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../core/youtube.dart';
import '../../data/models/article.dart';
import '../../state/bookmarks.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/app_image.dart';
import '../common/states.dart';
import 'widgets/article_body.dart';
import 'widgets/article_card.dart';
import 'widgets/text_size_sheet.dart';

/// Reading a story.
///
/// Full screen: no tab bar, no category rail. Once a reader has chosen a story
/// the only things on screen should be the story and the three things they
/// might want to do with it — resize it, save it, send it to someone.
class ArticlePage extends ConsumerWidget {
  const ArticlePage({super.key, required this.articleId, this.preloaded});

  final String articleId;

  /// Handed over by the card that was tapped, so the headline and photograph
  /// are on screen on the first frame and only the body waits on the network.
  final Article? preloaded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final fetched = ref.watch(articleProvider(articleId));

    // Prefer the fetched copy once it lands; fall back to what the feed already
    // had. Only a story that is neither is genuinely missing.
    final article = fetched.value ?? preloaded;

    if (article == null) {
      if (fetched.isLoading) {
        return const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        );
      }
      return Scaffold(
        appBar: AppBar(),
        body: EmptyState(
          icon: Icons.description_outlined,
          title: strings.storyNotFound,
          body: strings.storyNotFoundBody,
          action: FilledButton(
            onPressed: () => context.pop(),
            child: Text(strings.retry),
          ),
        ),
      );
    }

    return _ArticleView(
      article: article,
      strings: strings,
      // The body is the one field worth waiting for; everything else came with
      // the card.
      bodyPending: fetched.isLoading && preloaded != null,
    );
  }
}

class _ArticleView extends ConsumerWidget {
  const _ArticleView({
    required this.article,
    required this.strings,
    required this.bodyPending,
  });

  final Article article;
  final Strings strings;
  final bool bodyPending;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = ref.watch(categoriesByIdProvider)[article.categoryId];
    final brand = context.brand;

    final title = strings.pick(article.title, article.titleTa);
    final summary = strings.pick(article.summary, article.summaryTa);
    final body = strings.pick(article.body, article.bodyTa);

    // The reader has Tamil selected but this story only exists in English.
    // Saying so is better than letting them wonder whether the app is broken.
    final untranslated =
        strings.isTamil && article.titleTa.trim().isEmpty;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _ArticleAppBar(article: article),

          SliverPadding(
            padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, 0),
            sliver: SliverList.list(
              children: [
                Row(
                  children: [
                    if (category != null)
                      Text(
                        strings
                            .pick(category.name, category.nameTa)
                            .toUpperCase(),
                        style: context.texts.labelSmall?.copyWith(
                          color: category.isObituary
                              ? brand.mutedForeground
                              : context.scheme.primary,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    const Spacer(),
                    Text(
                      Dates.relative(article.publishedAt, strings),
                      style: context.texts.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: Gap.md),

                Text(title, style: context.texts.headlineLarge),

                const SizedBox(height: Gap.md),
                _Byline(article: article, strings: strings),

                if (untranslated) ...[
                  const SizedBox(height: Gap.lg),
                  _Notice(text: strings.showingEnglish),
                ],

                if (summary.isNotEmpty) ...[
                  const SizedBox(height: Gap.xl),
                  Standfirst(text: summary),
                ],

                if (article.hasVideo) ...[
                  const SizedBox(height: Gap.xl),
                  _VideoCard(
                    url: article.youtubeUrl!,
                    label: strings.watchOnYouTube,
                  ),
                ],

                const SizedBox(height: Gap.xl),

                if (bodyPending && body.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: Gap.xl),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else
                  ArticleBody(html: body),

                // Images beyond the lead, which is already the header.
                if (article.images.length > 1) ...[
                  const SizedBox(height: Gap.lg),
                  for (final image in article.images.skip(1)) ...[
                    _Figure(url: image.url, caption: image.caption),
                    const SizedBox(height: Gap.lg),
                  ],
                ],

                if (article.tags.isNotEmpty) ...[
                  const SizedBox(height: Gap.lg),
                  Wrap(
                    spacing: Gap.sm,
                    runSpacing: Gap.sm,
                    children: [
                      for (final tag in article.tags)
                        Chip(
                          label: Text(tag),
                          visualDensity: VisualDensity.compact,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                    ],
                  ),
                ],

                if (article.sourceName.isNotEmpty) ...[
                  const SizedBox(height: Gap.xl),
                  Text(
                    '${strings.source}: ${article.sourceName}',
                    style: context.texts.bodySmall,
                  ),
                ],

                const SizedBox(height: Gap.xxl),
              ],
            ),
          ),

          _RelatedStories(article: article, strings: strings),

          const SliverToBoxAdapter(child: SizedBox(height: Gap.xxl)),
        ],
      ),
      bottomNavigationBar: _ArticleActions(article: article, strings: strings),
    );
  }
}

/* -------------------------------------------------------------------------- */

/// The collapsing header.
///
/// The photograph parallaxes away and the bar resolves to a plain title bar, so
/// the headline is still identifiable once the image is gone.
class _ArticleAppBar extends StatelessWidget {
  const _ArticleAppBar({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    final image = article.leadImage;
    if (image == null) {
      return SliverAppBar(
        pinned: true,
        leading: const _CircleBack(onImage: false),
        backgroundColor: context.scheme.surface,
        shape: Border(bottom: BorderSide(color: context.brand.border)),
      );
    }

    return SliverAppBar(
      pinned: true,
      expandedHeight: 320,
      backgroundColor: context.scheme.surface,
      surfaceTintColor: Colors.transparent,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      leading: const _CircleBack(onImage: true),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Hero(
              tag: 'article-image-${article.id}',
              child: AppImage(url: image.url, fit: BoxFit.cover),
            ),
            // Only enough scrim at the top to keep the back button visible.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.35],
                  colors: [Color(0x66000000), Colors.transparent],
                ),
              ),
              child: SizedBox.expand(),
            ),
            if (image.caption.isNotEmpty)
              Positioned(
                left: Gap.page,
                right: Gap.page,
                bottom: Gap.md,
                child: Text(
                  image.caption,
                  style: context.texts.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.92),
                    shadows: const [
                      Shadow(blurRadius: 8, color: Color(0xCC000000)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CircleBack extends StatelessWidget {
  const _CircleBack({required this.onImage});

  final bool onImage;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(6),
      child: Material(
        color: onImage
            ? Colors.black.withValues(alpha: 0.35)
            : Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => context.pop(),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(
              Icons.arrow_back,
              color: onImage ? Colors.white : context.scheme.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}

class _Byline extends StatelessWidget {
  const _Byline({required this.article, required this.strings});

  final Article article;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final byline = article.byline;
    if (byline.isEmpty && article.publishedAt == null) {
      return const SizedBox.shrink();
    }

    final brand = context.brand;
    final initial = byline.isEmpty ? '·' : byline.characters.first.toUpperCase();

    return Row(
      children: [
        Container(
          height: 34,
          width: 34,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: brand.muted,
            shape: BoxShape.circle,
          ),
          child: Text(
            initial,
            style: context.texts.labelMedium?.copyWith(
              color: brand.mutedForeground,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: Gap.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (byline.isNotEmpty)
                Text(byline, style: context.texts.titleSmall),
              Text(
                Dates.short(article.publishedAt),
                style: context.texts.bodySmall,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Gap.md),
      decoration: BoxDecoration(
        color: context.scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Row(
        children: [
          Icon(
            Icons.translate,
            size: 17,
            color: context.scheme.onTertiaryContainer,
          ),
          const SizedBox(width: Gap.sm),
          Expanded(
            child: Text(
              text,
              style: context.texts.bodySmall?.copyWith(
                color: context.scheme.onTertiaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({required this.url, required this.label});

  final String url;
  final String label;

  @override
  Widget build(BuildContext context) {
    final id = YouTube.extractId(url);

    return GestureDetector(
      onTap: () async {
        final target = Uri.tryParse(url);
        if (target == null) return;
        await launchUrl(target, mode: LaunchMode.externalApplication);
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.lg),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppImage(
                url: id == null ? null : YouTube.thumbnail(id),
              ),
              const ImageScrim(strength: 0.55),
              Center(
                child: Container(
                  height: 56,
                  width: 56,
                  decoration: const BoxDecoration(
                    color: Color(0xE6FF0000),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
              ),
              Positioned(
                left: Gap.md,
                bottom: Gap.md,
                child: Text(
                  label,
                  style: context.texts.labelMedium?.copyWith(
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.url, required this.caption});

  final String url;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppImage(url: url, borderRadius: BorderRadius.circular(Radii.md)),
        if (caption.isNotEmpty) ...[
          const SizedBox(height: Gap.sm),
          Text(caption, style: context.texts.bodySmall),
        ],
      ],
    );
  }
}

class _RelatedStories extends ConsumerWidget {
  const _RelatedStories({required this.article, required this.strings});

  final Article article;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final related =
        ref
            .watch(
              relatedArticlesProvider((
                categoryId: article.categoryId,
                excludeId: article.id,
              )),
            )
            .value ??
        const [];
    if (related.isEmpty) return const SliverToBoxAdapter();

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: Gap.page),
      sliver: SliverList.list(
        children: [
          Divider(color: context.brand.border),
          const SizedBox(height: Gap.xl),
          Text(strings.relatedStories, style: context.texts.titleMedium),
          const SizedBox(height: Gap.lg),
          for (final entry in related) ...[
            ArticleCard(
              article: entry,
              variant: ArticleCardVariant.compact,
            ),
            const SizedBox(height: Gap.lg),
          ],
        ],
      ),
    );
  }
}

/// Save, share, resize. The three things a reader does with a story.
class _ArticleActions extends ConsumerWidget {
  const _ArticleActions({required this.article, required this.strings});

  final Article article;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(isBookmarkedProvider(article.id));
    final brand = context.brand;

    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: context.scheme.surface,
          border: Border(top: BorderSide(color: brand.border)),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.sm,
          vertical: Gap.xs,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _Action(
              icon: Icons.text_fields,
              label: strings.textSize,
              onTap: () => showTextSizeSheet(context),
            ),
            _Action(
              icon: saved ? Icons.bookmark : Icons.bookmark_border,
              label: saved ? strings.savedDone : strings.save,
              highlighted: saved,
              onTap: () async {
                final messenger = ScaffoldMessenger.of(context);
                final nowSaved = await ref
                    .read(bookmarksProvider.notifier)
                    .toggle(article);
                messenger.hideCurrentSnackBar();
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(
                      nowSaved ? strings.savedDone : strings.removed,
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
            ),
            _Action(
              icon: Icons.share_outlined,
              label: strings.share,
              onTap: () {
                final headline = strings.pick(article.title, article.titleTa);
                // Shares the reader site, not a deep link: a recipient without
                // the app installed must land on something readable. Once the
                // app has a published domain and App Links, this becomes a URL
                // that opens the app when it is installed and the site when it
                // is not.
                SharePlus.instance.share(
                  ShareParams(
                    text:
                        '$headline\n\nhttps://nilgiri-news.web.app/article/${article.id}',
                    subject: headline,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final color = highlighted
        ? context.scheme.primary
        : context.brand.mutedForeground;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(Radii.md),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: Gap.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 21, color: color),
              const SizedBox(height: 3),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.texts.labelSmall?.copyWith(color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
