import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../state/preferences.dart';
import '../../../state/providers.dart';

/// The section rail, scrolling under the masthead.
///
/// The masthead is what stays put; this scrolls away with the feed. Which
/// section somebody is reading is a choice made once and then not looked at
/// again, so it does not need to hold a strip of the screen all session.
class CategoryRailHeader extends ConsumerWidget {
  const CategoryRailHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SliverPersistentHeader(
      pinned: false,
      delegate: _RailDelegate(
        height: 52,
        background: context.scheme.surface,
        border: context.brand.border,
        child: const _CategoryRail(),
      ),
    );
  }
}

class _CategoryRail extends ConsumerWidget {
  const _CategoryRail();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final categories = ref.watch(categoriesProvider).value ?? const [];
    final selected = ref.watch(selectedCategoryProvider);

    // "All" is the absence of a filter rather than a category document, so it
    // is prepended here instead of being seeded into Firestore.
    final entries = <({String id, String label})>[
      (id: 'all', label: strings.all),
      for (final category in categories)
        (id: category.id, label: strings.pick(category.name, category.nameTa)),
    ];

    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: Gap.page, vertical: 8),
      itemCount: entries.length,
      separatorBuilder: (context, index) => const SizedBox(width: 6),
      itemBuilder: (context, index) {
        final entry = entries[index];
        return _RailChip(
          label: entry.label,
          selected: selected == entry.id,
          onTap: () =>
              ref.read(selectedCategoryProvider.notifier).select(entry.id),
        );
      },
    );
  }
}

class _RailChip extends StatelessWidget {
  const _RailChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final brand = context.brand;

    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? scheme.primary : brand.muted,
            borderRadius: BorderRadius.circular(999),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: context.texts.labelMedium?.copyWith(
              color: selected ? scheme.onPrimary : brand.mutedForeground,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _RailDelegate extends SliverPersistentHeaderDelegate {
  const _RailDelegate({
    required this.height,
    required this.background,
    required this.border,
    required this.child,
  });

  final double height;
  final Color background;
  final Color border;
  final Widget child;

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        border: Border(bottom: BorderSide(color: border)),
      ),
      child: SizedBox(height: height, child: child),
    );
  }

  @override
  bool shouldRebuild(covariant _RailDelegate oldDelegate) {
    return oldDelegate.height != height ||
        oldDelegate.background != background ||
        oldDelegate.border != border ||
        oldDelegate.child != child;
  }
}
