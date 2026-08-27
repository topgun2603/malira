import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/event.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/app_image.dart';
import '../common/states.dart';

/// One event, in full.
class EventDetailPage extends ConsumerWidget {
  const EventDetailPage({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final event = ref.watch(eventProvider(eventId));

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              final item = event.value;
              if (item == null) return;
              SharePlus.instance.share(
                ShareParams(
                  text:
                      '${strings.pick(item.title, item.titleTa)}\n'
                      '${Dates.eventStamp(item.startsAt)}\n'
                      '${strings.pick(item.venue, item.venueTa)}',
                ),
              );
            },
          ),
        ],
      ),
      body: switch (event) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(eventProvider(eventId)),
        ),
        AsyncData(:final value) when value == null => EmptyState(
          icon: Icons.event_busy_outlined,
          title: strings.storyNotFound,
          body: strings.storyNotFoundBody,
          action: FilledButton(
            onPressed: () => context.pop(),
            child: Text(strings.retry),
          ),
        ),
        AsyncData(:final value) => _EventDetail(
          event: value!,
          strings: strings,
        ),
      },
    );
  }
}

class _EventDetail extends StatelessWidget {
  const _EventDetail({required this.event, required this.strings});

  final EventItem event;
  final Strings strings;

  Future<void> _launch(String url) async {
    final target = Uri.tryParse(url);
    if (target == null || url.isEmpty) return;
    await launchUrl(target, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final description = strings.pick(
      event.description,
      event.descriptionTa,
    );
    final venue = strings.pick(event.venue, event.venueTa);

    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, 0, Gap.page, Gap.xxl),
      children: [
        if (event.poster != null) ...[
          AppImage(
            url: event.poster!.url,
            borderRadius: BorderRadius.circular(Radii.lg),
          ),
          const SizedBox(height: Gap.xl),
        ],

        Text(
          strings
              .pick(event.category.label, event.category.labelTa)
              .toUpperCase(),
          style: context.texts.labelSmall?.copyWith(
            color: brand.saffron,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: Gap.sm),
        Text(
          strings.pick(event.title, event.titleTa),
          style: context.texts.headlineMedium,
        ),

        const SizedBox(height: Gap.xl),

        _DetailRow(
          icon: Icons.schedule,
          label: strings.upcoming,
          value: [
            Dates.eventStamp(event.startsAt),
            if (event.endsAt != null) '→ ${Dates.eventStamp(event.endsAt)}',
          ].where((part) => part.isNotEmpty).join('\n'),
        ),

        if (venue.isNotEmpty)
          _DetailRow(
            icon: Icons.place_outlined,
            label: strings.venue,
            value: venue,
            action: event.mapUrl.isEmpty
                ? null
                : _InlineAction(
                    label: strings.openMap,
                    icon: Icons.map_outlined,
                    onTap: () => _launch(event.mapUrl),
                  ),
          ),

        if (event.organiserName.isNotEmpty)
          _DetailRow(
            icon: Icons.person_outline,
            label: strings.organiser,
            value: event.organiserName,
            action: event.organiserPhone.isEmpty
                ? null
                : _InlineAction(
                    label: strings.call,
                    icon: Icons.call_outlined,
                    onTap: () => _launch('tel:${event.organiserPhone}'),
                  ),
          ),

        if (description.isNotEmpty) ...[
          const SizedBox(height: Gap.lg),
          Divider(color: brand.border),
          const SizedBox(height: Gap.lg),
          Text(description, style: context.texts.bodyLarge),
        ],
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.action,
  });

  final IconData icon;
  final String label;
  final String value;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    final brand = context.brand;

    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 36,
            width: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: brand.muted,
              borderRadius: BorderRadius.circular(Radii.sm),
            ),
            child: Icon(icon, size: 18, color: brand.mutedForeground),
          ),
          const SizedBox(width: Gap.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: context.texts.labelSmall?.copyWith(
                    color: brand.mutedForeground,
                    letterSpacing: 0.7,
                  ),
                ),
                const SizedBox(height: 2),
                Text(value, style: context.texts.bodyLarge),
                if (action != null) ...[
                  const SizedBox(height: Gap.sm),
                  action!,
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineAction extends StatelessWidget {
  const _InlineAction({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 38),
        padding: const EdgeInsets.symmetric(horizontal: Gap.md),
        textStyle: context.texts.labelMedium,
      ),
    );
  }
}
