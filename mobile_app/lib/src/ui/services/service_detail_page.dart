import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../../state/vendors.dart';
import '../common/app_image.dart';
import '../common/states.dart';

/// One business.
///
/// The phone number is shown outright rather than earned. This is a business
/// paying to be reachable, which is the exact opposite of a matrimony listing
/// — the whole point of the directory is that somebody can ring the hall.
class ServiceDetailPage extends ConsumerStatefulWidget {
  const ServiceDetailPage({super.key, required this.id});

  final String id;

  @override
  ConsumerState<ServiceDetailPage> createState() => _ServiceDetailPageState();
}

class _ServiceDetailPageState extends ConsumerState<ServiceDetailPage> {
  int _shown = 0;

  Future<void> _open(String url) async {
    final target = Uri.tryParse(url);
    if (target == null) return;
    await launchUrl(target, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final vendor = ref.watch(vendorProvider(widget.id));
    final brand = context.brand;

    return Scaffold(
      appBar: AppBar(title: Text(strings.services)),
      body: switch (vendor) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(vendorProvider(widget.id)),
        ),
        // A listing that is not live reads as missing rather than as hidden.
        // Telling a passer-by "this is unpaid" would expose the business's
        // billing to anyone who kept an old link.
        AsyncData(:final value) when value == null || !value.isLive =>
          EmptyState(
            icon: Icons.storefront_outlined,
            title: strings.noServices,
            body: strings.noServicesBody,
          ),
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.md,
            Gap.page,
            Gap.xxl,
          ),
          children: [
            if (value!.photos.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(Radii.lg),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: AppImage(
                    url: value.photos[_shown].url,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              if (value.photos.length > 1) ...[
                const SizedBox(height: Gap.sm),
                SizedBox(
                  height: 64,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: value.photos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: Gap.sm),
                    itemBuilder: (context, index) => GestureDetector(
                      onTap: () => setState(() => _shown = index),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(Radii.sm),
                        child: SizedBox(
                          width: 64,
                          child: Opacity(
                            opacity: index == _shown ? 1 : 0.6,
                            child: AppImage(
                              url: value.photos[index].url,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: Gap.lg),
            ],

            Text(value.name, style: context.texts.headlineSmall),
            const SizedBox(height: 2),
            Text(
              strings.pick(value.category.label, value.category.labelTa),
              style: context.texts.bodyMedium?.copyWith(
                color: brand.mutedForeground,
              ),
            ),

            if (strings.pick(value.about, value.aboutTa).isNotEmpty) ...[
              const SizedBox(height: Gap.lg),
              Text(
                strings.pick(value.about, value.aboutTa),
                style: context.texts.bodyLarge?.copyWith(height: 1.45),
              ),
            ],

            const SizedBox(height: Gap.lg),
            if (value.capacity > 0)
              _Fact(
                icon: Icons.groups_outlined,
                label: '${strings.seats} ${value.capacity}',
              ),
            if (value.priceFromInPaise > 0)
              _Fact(
                icon: Icons.currency_rupee,
                label: '${(value.priceFromInPaise / 100).round()}',
              ),
            if (value.address.isNotEmpty || value.town.isNotEmpty)
              _Fact(
                icon: Icons.place_outlined,
                label: [
                  value.address,
                  value.town,
                ].where((part) => part.isNotEmpty).join(', '),
              ),

            for (final entry in value.details.entries)
              if (entry.value.trim().isNotEmpty)
                _Fact(
                  icon: Icons.info_outline,
                  label: '${entry.key}: ${entry.value}',
                ),

            const SizedBox(height: Gap.xl),
            if (value.phone.isNotEmpty)
              FilledButton.icon(
                onPressed: () => _open('tel:${value.phone}'),
                icon: const Icon(Icons.call_outlined),
                label: Text(value.phone),
              ),
            if (value.whatsapp.isNotEmpty) ...[
              const SizedBox(height: Gap.sm),
              OutlinedButton.icon(
                onPressed: () => _open(
                  'https://wa.me/${value.whatsapp.replaceAll(RegExp(r'[^0-9]'), '')}',
                ),
                icon: const Icon(Icons.chat_outlined),
                label: const Text('WhatsApp'),
              ),
            ],
            if (value.mapUrl.isNotEmpty) ...[
              const SizedBox(height: Gap.sm),
              OutlinedButton.icon(
                onPressed: () => _open(value.mapUrl),
                icon: const Icon(Icons.map_outlined),
                label: Text(strings.pick('Map', 'வரைபடம்')),
              ),
            ],
          ],
        ),
      },
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: brand.mutedForeground),
          const SizedBox(width: Gap.md),
          Expanded(
            child: Text(label, style: context.texts.bodyMedium),
          ),
        ],
      ),
    );
  }
}
