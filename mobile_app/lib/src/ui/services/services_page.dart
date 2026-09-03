import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/vendor.dart';
import '../../state/preferences.dart';
import '../../state/vendors.dart';
import '../common/app_image.dart';
import '../common/states.dart';

/// The wedding services directory.
///
/// Public, with no sign-in gate. A hall is a business advertising itself, which
/// is the opposite of a matrimony listing: it wants to be found by anyone.
class ServicesPage extends ConsumerWidget {
  const ServicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final results = ref.watch(vendorSearchProvider);
    final filters = ref.watch(vendorFiltersProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.services)),
      body: Column(
        children: [
          _CategoryStrip(strings: strings, selected: filters.category),
          Expanded(
            child: switch (results) {
              AsyncLoading() => const Center(child: CircularProgressIndicator()),
              AsyncError() => ErrorStateView(
                title: strings.offlineTitle,
                body: strings.offlineBody,
                retryLabel: strings.retry,
                onRetry: () => ref.invalidate(vendorSearchProvider),
              ),
              AsyncData(:final value) when value.isEmpty => EmptyState(
                icon: Icons.storefront_outlined,
                title: strings.noServices,
                body: strings.noServicesBody,
                action: filters.isEmpty
                    ? null
                    : OutlinedButton(
                        onPressed: () =>
                            ref.read(vendorFiltersProvider.notifier).clear(),
                        child: Text(strings.clearFilters),
                      ),
              ),
              AsyncData(:final value) => RefreshIndicator(
                onRefresh: () async => ref.invalidate(vendorSearchProvider),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(
                    Gap.page,
                    Gap.sm,
                    Gap.page,
                    Gap.xxl,
                  ),
                  itemCount: value.length,
                  itemBuilder: (context, index) => Padding(
                    padding: const EdgeInsets.only(bottom: Gap.lg),
                    child: _VendorCard(vendor: value[index], strings: strings),
                  ),
                ),
              ),
            },
          ),
        ],
      ),
    );
  }
}

class _CategoryStrip extends ConsumerWidget {
  const _CategoryStrip({required this.strings, required this.selected});

  final Strings strings;
  final VendorCategory? selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(vendorFiltersProvider.notifier);

    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: Gap.page),
        children: [
          Padding(
            padding: const EdgeInsets.only(right: Gap.sm, top: Gap.sm),
            child: ChoiceChip(
              label: Text(strings.everything),
              selected: selected == null,
              onSelected: (_) => notifier.setCategory(null),
            ),
          ),
          for (final category in VendorCategory.values)
            Padding(
              padding: const EdgeInsets.only(right: Gap.sm, top: Gap.sm),
              child: ChoiceChip(
                label: Text(
                  strings.pick(category.label, category.labelTa),
                ),
                selected: selected == category,
                onSelected: (_) => notifier.setCategory(category),
              ),
            ),
        ],
      ),
    );
  }
}

class _VendorCard extends StatelessWidget {
  const _VendorCard({required this.vendor, required this.strings});

  final Vendor vendor;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      borderRadius: BorderRadius.circular(Radii.lg),
      onTap: () => context.push('/services/${vendor.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: context.scheme.surface,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: brand.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: vendor.photos.isEmpty
                  ? Container(
                      color: brand.muted,
                      child: Icon(
                        Icons.storefront_outlined,
                        size: 32,
                        color: brand.mutedForeground,
                      ),
                    )
                  : AppImage(url: vendor.photos.first.url, fit: BoxFit.cover),
            ),
            Padding(
              padding: const EdgeInsets.all(Gap.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          vendor.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.texts.titleMedium,
                        ),
                      ),
                      if (vendor.featured)
                        Icon(Icons.star, size: 16, color: brand.saffron),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    strings.pick(vendor.category.label, vendor.category.labelTa),
                    style: context.texts.bodySmall,
                  ),
                  if (vendor.town.isNotEmpty) ...[
                    const SizedBox(height: Gap.sm),
                    _Line(icon: Icons.place_outlined, text: vendor.town),
                  ],
                  if (vendor.capacity > 0)
                    _Line(
                      icon: Icons.groups_outlined,
                      text: '${strings.seats} ${vendor.capacity}',
                    ),
                  if (vendor.phone.isNotEmpty)
                    _Line(icon: Icons.call_outlined, text: vendor.phone),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(
        children: [
          Icon(icon, size: 14, color: brand.mutedForeground),
          const SizedBox(width: Gap.sm),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.texts.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}
