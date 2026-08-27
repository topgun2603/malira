import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/bookmarks.dart';
import '../../state/preferences.dart';
import '../common/states.dart';
import 'widgets/article_card.dart';
import 'widgets/masthead.dart';

/// Stories the reader kept.
///
/// Served entirely from disk. This is the one tab that works with no signal at
/// all, which for this readership is the whole reason it exists.
class SavedPage extends ConsumerWidget {
  const SavedPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final saved = ref.watch(bookmarksProvider);

    return Scaffold(
      appBar: PageAppBar(
        showMenu: true,
        title: strings.saved,
        actions: [
          if (saved.isNotEmpty)
            IconButton(
              tooltip: strings.removed,
              icon: const Icon(Icons.delete_outline),
              onPressed: () => _confirmClear(context, ref, strings),
            ),
        ],
      ),
      body: saved.isEmpty
          ? EmptyState(
              icon: Icons.bookmark_border,
              title: strings.nothingSaved,
              body: strings.nothingSavedBody,
            )
          : ListView.separated(
              padding: const EdgeInsets.symmetric(
                horizontal: Gap.page,
                vertical: Gap.lg,
              ),
              itemCount: saved.length,
              separatorBuilder: (context, index) => Padding(
                padding: const EdgeInsets.symmetric(vertical: Gap.lg),
                child: Divider(color: context.brand.border, height: 1),
              ),
              itemBuilder: (context, index) {
                final article = saved[index];
                return Dismissible(
                  key: ValueKey(article.id),
                  direction: DismissDirection.endToStart,
                  background: _RemoveBackground(label: strings.removed),
                  onDismissed: (_) =>
                      ref.read(bookmarksProvider.notifier).toggle(article),
                  child: ArticleCard(article: article),
                );
              },
            ),
    );
  }

  Future<void> _confirmClear(
    BuildContext context,
    WidgetRef ref,
    Strings strings,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.saved),
        content: Text(
          strings.isTamil
              ? 'சேமித்த அனைத்துச் செய்திகளையும் நீக்கவா?'
              : 'Remove every saved story?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              strings.isTamil ? 'வேண்டாம்' : 'Cancel',
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(strings.isTamil ? 'நீக்கு' : 'Remove'),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      await ref.read(bookmarksProvider.notifier).clear();
    }
  }
}

class _RemoveBackground extends StatelessWidget {
  const _RemoveBackground({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.centerRight,
      padding: const EdgeInsets.only(right: Gap.lg),
      decoration: BoxDecoration(
        color: context.scheme.error.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: context.texts.labelMedium?.copyWith(
              color: context.scheme.error,
            ),
          ),
          const SizedBox(width: Gap.sm),
          Icon(Icons.delete_outline, color: context.scheme.error, size: 20),
        ],
      ),
    );
  }
}
