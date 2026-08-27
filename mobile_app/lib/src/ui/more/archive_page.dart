import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/article.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/states.dart';
import '../news/widgets/article_card.dart';
import '../news/widgets/masthead.dart';

/// Every month that has published stories in it.
///
/// The feed pages backwards indefinitely, so this is not the only way to reach
/// an old story — but "what went out last March" is a question the feed answers
/// badly and a month list answers instantly.
class ArchivePage extends ConsumerWidget {
  const ArchivePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final months = ref.watch(archiveMonthsProvider);

    return Scaffold(
      appBar: PageAppBar(title: strings.archive),
      body: switch (months) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(archiveMonthsProvider),
        ),
        AsyncData(:final value) when value.isEmpty => EmptyState(
          icon: Icons.calendar_month_outlined,
          title: strings.noStories,
          body: strings.noStoriesBody,
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: Gap.sm),
          itemCount: value.length,
          separatorBuilder: (context, index) =>
              Divider(color: context.brand.border, height: 1),
          itemBuilder: (context, index) {
            final month = value[index];
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: Gap.page,
                vertical: 4,
              ),
              title: Text(
                Dates.monthAndYear(month.date),
                style: context.texts.bodyLarge,
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('${month.count}', style: context.texts.bodyMedium),
                  const SizedBox(width: Gap.sm),
                  Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: context.brand.mutedForeground,
                  ),
                ],
              ),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (context) => _ArchiveMonthPage(
                    monthKey: month.key,
                    label: Dates.monthAndYear(month.date),
                  ),
                ),
              ),
            );
          },
        ),
      },
    );
  }
}

/// One month of the archive.
///
/// Fetched directly rather than through the feed notifier: this is a
/// self-contained lookup, and routing it through the feed would leave the front
/// page filtered to March when the reader went back.
class _ArchiveMonthPage extends ConsumerStatefulWidget {
  const _ArchiveMonthPage({required this.monthKey, required this.label});

  final String monthKey;
  final String label;

  @override
  ConsumerState<_ArchiveMonthPage> createState() => _ArchiveMonthPageState();
}

class _ArchiveMonthPageState extends ConsumerState<_ArchiveMonthPage> {
  late Future<List<Article>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Article>> _load() async {
    final page = await ref
        .read(newsRepositoryProvider)
        .feedPage(pageSize: 100, month: widget.monthKey);
    return page.articles;
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: PageAppBar(title: widget.label),
      body: FutureBuilder<List<Article>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorStateView(
              title: strings.offlineTitle,
              body: strings.offlineBody,
              retryLabel: strings.retry,
              onRetry: () => setState(() => _future = _load()),
            );
          }

          final articles = snapshot.data ?? const <Article>[];
          if (articles.isEmpty) {
            return EmptyState(
              icon: Icons.newspaper_outlined,
              title: strings.noStories,
              body: strings.noStoriesBody,
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.symmetric(
              horizontal: Gap.page,
              vertical: Gap.lg,
            ),
            itemCount: articles.length,
            separatorBuilder: (context, index) => Padding(
              padding: const EdgeInsets.symmetric(vertical: Gap.lg),
              child: Divider(color: context.brand.border, height: 1),
            ),
            itemBuilder: (context, index) =>
                ArticleCard(article: articles[index]),
          );
        },
      ),
    );
  }
}
