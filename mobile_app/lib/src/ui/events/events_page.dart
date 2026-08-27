import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/event.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/generated_cover.dart';
import '../common/states.dart';
import '../shell/root_shell.dart';

/// Which category the calendar is filtered to. Null is everything.
class _EventFilter extends Notifier<EventCategory?> {
  @override
  EventCategory? build() => null;

  void select(EventCategory? category) => state = category;
}

final _eventFilterProvider =
    NotifierProvider<_EventFilter, EventCategory?>(_EventFilter.new);

/// The community calendar.
///
/// Built as a timeline rather than a list of equal cards, because the question
/// somebody brings to this screen is "what is coming and can I get to it" —
/// which is a question about *when*, not about *what*. So the spine down the
/// left carries the dates, the next event gets the whole width, and everything
/// else falls into relative buckets: this week, this month, later.
///
/// Past events moved off the front. They are a record worth keeping — somebody
/// looking for last year's festival date should find it — but giving them half
/// the header cost the upcoming list a row of screen for something nobody
/// opens the app to see.
class EventsPage extends ConsumerWidget {
  const EventsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final events = ref.watch(eventsProvider);
    final split = ref.watch(splitEventsProvider);
    final filter = ref.watch(_eventFilterProvider);

    final upcoming = filter == null
        ? split.upcoming
        : split.upcoming
              .where((event) => event.category == filter)
              .toList(growable: false);

    return Scaffold(
      appBar: AppBar(
        leading: const AppMenuButton(),
        title: Text(strings.events, style: context.texts.titleLarge),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: Gap.md),
            child: LanguageToggle(),
          ),
        ],
        shape: Border(bottom: BorderSide(color: context.brand.border)),
      ),
      body: switch (events) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(eventsProvider),
        ),
        AsyncData() => RefreshIndicator(
          onRefresh: () async => ref.invalidate(eventsProvider),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _CategoryRail(selected: filter, strings: strings),
              ),

              if (upcoming.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(
                    icon: Icons.event_outlined,
                    title: strings.noEvents,
                    body: strings.noEventsBody,
                    action: filter == null
                        ? null
                        : OutlinedButton(
                            onPressed: () => ref
                                .read(_eventFilterProvider.notifier)
                                .select(null),
                            child: Text(strings.clearFilters),
                          ),
                  ),
                )
              else ...[
                SliverToBoxAdapter(
                  child: _NextUp(event: upcoming.first, strings: strings),
                ),
                ..._timelineSlivers(upcoming.skip(1).toList(), strings),
              ],

              SliverToBoxAdapter(
                child: _PastEventsTile(
                  count: split.past.length,
                  strings: strings,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: Gap.xxl)),
            ],
          ),
        ),
      },
    );
  }

  /// Groups the rest of the calendar into relative buckets.
  ///
  /// Relative, not by calendar month: on the 29th, "this month" would hold two
  /// days and "next month" everything, which tells a reader nothing.
  static List<Widget> _timelineSlivers(
    List<EventItem> events,
    Strings strings,
  ) {
    if (events.isEmpty) return const [];

    final now = DateTime.now();
    final weekEnd = now.add(const Duration(days: 7));
    final monthEnd = now.add(const Duration(days: 31));

    final buckets = <String, List<EventItem>>{
      strings.thisWeek: [],
      strings.thisMonth: [],
      strings.later: [],
    };

    for (final event in events) {
      final start = event.startsAt;
      if (start == null) {
        buckets[strings.later]!.add(event);
      } else if (start.isBefore(weekEnd)) {
        buckets[strings.thisWeek]!.add(event);
      } else if (start.isBefore(monthEnd)) {
        buckets[strings.thisMonth]!.add(event);
      } else {
        buckets[strings.later]!.add(event);
      }
    }

    final slivers = <Widget>[];
    buckets.forEach((label, group) {
      if (group.isEmpty) return;
      slivers.add(SliverToBoxAdapter(child: _BucketHeading(label: label)));
      slivers.add(
        SliverList.builder(
          itemCount: group.length,
          itemBuilder: (context, index) => _TimelineRow(
            event: group[index],
            strings: strings,
            isLast: index == group.length - 1,
          ),
        ),
      );
    });
    return slivers;
  }
}

/// The category filter.
class _CategoryRail extends ConsumerWidget {
  const _CategoryRail({required this.selected, required this.strings});

  final EventCategory? selected;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void select(EventCategory? category) =>
        ref.read(_eventFilterProvider.notifier).select(category);

    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.page,
          vertical: Gap.sm,
        ),
        children: [
          _FilterChip(
            label: strings.allCategories,
            selected: selected == null,
            onTap: () => select(null),
          ),
          for (final category in EventCategory.values) ...[
            const SizedBox(width: 6),
            _FilterChip(
              label: strings.pick(category.label, category.labelTa),
              selected: selected == category,
              onTap: () => select(category),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
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

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? scheme.primary : brand.muted,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: context.texts.labelMedium?.copyWith(
            color: selected ? scheme.onPrimary : brand.mutedForeground,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

/// The soonest event, given the whole width.
///
/// Leads with how far away it is rather than with the date. "In 3 days" is the
/// thing that decides whether somebody can go; the date is detail they read
/// second.
class _NextUp extends StatelessWidget {
  const _NextUp({required this.event, required this.strings});

  final EventItem event;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final start = event.startsAt;
    final venue = strings.pick(event.venue, event.venueTa);

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.sm, Gap.page, Gap.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 3,
                height: 14,
                decoration: BoxDecoration(
                  color: brand.saffron,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: Gap.sm),
              Text(
                strings.nextUp.toUpperCase(),
                style: context.texts.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.9,
                  color: brand.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: Gap.md),
          GestureDetector(
            onTap: () => context.push('/event/${event.id}'),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(Radii.xl),
              child: AspectRatio(
                aspectRatio: 16 / 11,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    GeneratedCover(
                      seed: event.id,
                      label: event.title,
                      imageUrl: event.poster?.url,
                      radius: 0,
                      // The title is drawn over this; the gradient alone is
                      // the backdrop.
                      plain: true,
                    ),
                    const CoverScrim(),
                    Padding(
                      padding: const EdgeInsets.all(Gap.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              _Countdown(start: start, strings: strings),
                              const Spacer(),
                              _OnImageChip(
                                label: strings.pick(
                                  event.category.label,
                                  event.category.labelTa,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            strings.pick(event.title, event.titleTa),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: context.texts.headlineSmall?.copyWith(
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: Gap.sm),
                          _OnImageLine(
                            icon: Icons.schedule,
                            text: [
                              Dates.eventDay(start, strings),
                              if (start != null) Dates.time(start),
                            ].where((part) => part.isNotEmpty).join(' · '),
                          ),
                          if (venue.isNotEmpty) ...[
                            const SizedBox(height: 3),
                            _OnImageLine(
                              icon: Icons.place_outlined,
                              text: venue,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A saffron pill saying how far away the event is.
class _Countdown extends StatelessWidget {
  const _Countdown({required this.start, required this.strings});

  final DateTime? start;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final when = start;
    if (when == null) return const SizedBox.shrink();

    final now = DateTime.now();
    final days = DateTime(when.year, when.month, when.day)
        .difference(DateTime(now.year, now.month, now.day))
        .inDays;

    final label = switch (days) {
      <= 0 => strings.today2,
      1 => strings.tomorrow,
      _ => strings.inDays(days),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: context.brand.saffron,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _BucketHeading extends StatelessWidget {
  const _BucketHeading({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.lg, Gap.page, Gap.md),
      child: Row(
        children: [
          Text(
            label.toUpperCase(),
            style: context.texts.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.9,
              color: context.brand.mutedForeground,
            ),
          ),
          const SizedBox(width: Gap.md),
          Expanded(child: Divider(color: context.brand.border, height: 1)),
        ],
      ),
    );
  }
}

/// One event on the spine.
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.event,
    required this.strings,
    required this.isLast,
  });

  final EventItem event;
  final Strings strings;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final scheme = context.scheme;
    final start = event.startsAt;
    final venue = strings.pick(event.venue, event.venueTa);

    return GestureDetector(
      onTap: () => context.push('/event/${event.id}'),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Gap.page),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date, then spine, then event. Reading order is when → what,
              // which is the order the question arrives in.
              SizedBox(
                width: 44,
                child: Column(
                  children: [
                    Text(
                      Dates.dayNumber(start),
                      style: context.texts.titleLarge?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                      ),
                    ),
                    Text(
                      Dates.monthAbbrev(start).toUpperCase(),
                      style: context.texts.labelSmall?.copyWith(
                        color: brand.mutedForeground,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: Gap.md),

              _Spine(isLast: isLast),
              const SizedBox(width: Gap.md),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: Gap.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        strings
                            .pick(event.category.label, event.category.labelTa)
                            .toUpperCase(),
                        style: context.texts.labelSmall?.copyWith(
                          color: brand.saffron,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.7,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        strings.pick(event.title, event.titleTa),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: context.texts.titleMedium,
                      ),
                      const SizedBox(height: 5),
                      _MetaLine(
                        icon: Icons.schedule,
                        text: start == null ? '' : Dates.time(start),
                      ),
                      if (venue.isNotEmpty)
                        _MetaLine(icon: Icons.place_outlined, text: venue),
                    ],
                  ),
                ),
              ),

              if (event.poster != null) ...[
                const SizedBox(width: Gap.md),
                GeneratedCover(
                  seed: event.id,
                  label: event.title,
                  imageUrl: event.poster?.url,
                  height: 62,
                  width: 62,
                  radius: Radii.md,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// The dot and the line under it.
class _Spine extends StatelessWidget {
  const _Spine({required this.isLast});

  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;

    return SizedBox(
      width: 12,
      child: Column(
        children: [
          const SizedBox(height: 5),
          Container(
            height: 11,
            width: 11,
            decoration: BoxDecoration(
              color: scheme.surface,
              shape: BoxShape.circle,
              border: Border.all(color: scheme.primary, width: 2.4),
            ),
          ),
          if (!isLast)
            Expanded(child: Container(width: 2, color: context.brand.border)),
        ],
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 13, color: context.brand.mutedForeground),
          ),
          const SizedBox(width: 5),
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

/// The way back to what has already happened.
class _PastEventsTile extends ConsumerWidget {
  const _PastEventsTile({required this.count, required this.strings});

  final int count;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (count == 0) return const SizedBox.shrink();
    final brand = context.brand;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.lg, Gap.page, 0),
      child: GestureDetector(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (context) => const PastEventsPage()),
        ),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(Gap.lg),
          decoration: BoxDecoration(
            color: brand.muted,
            borderRadius: BorderRadius.circular(Radii.lg),
          ),
          child: Row(
            children: [
              Icon(Icons.history, size: 20, color: brand.mutedForeground),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Text(strings.pastEvents, style: context.texts.bodyLarge),
              ),
              Text('$count', style: context.texts.bodyMedium),
              const SizedBox(width: Gap.sm),
              Icon(Icons.chevron_right, size: 20, color: brand.mutedForeground),
            ],
          ),
        ),
      ),
    );
  }
}

/// Events that have already happened, most recent first.
class PastEventsPage extends ConsumerWidget {
  const PastEventsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final past = ref.watch(splitEventsProvider).past;

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.pastEvents, style: context.texts.titleLarge),
        shape: Border(bottom: BorderSide(color: context.brand.border)),
      ),
      body: past.isEmpty
          ? EmptyState(
              icon: Icons.history,
              title: strings.noEvents,
              body: strings.noEventsBody,
            )
          : ListView.builder(
              padding: const EdgeInsets.only(top: Gap.lg, bottom: Gap.xxl),
              itemCount: past.length,
              itemBuilder: (context, index) => Opacity(
                // Dimmed, because these are a record rather than a plan.
                opacity: 0.72,
                child: _TimelineRow(
                  event: past[index],
                  strings: strings,
                  isLast: index == past.length - 1,
                ),
              ),
            ),
    );
  }
}

/// A scrim for text over a generated cover.
///
/// Lighter at the top than the article scrim: that one is tuned for
/// photographs with bright skies, and this sits over a flat gradient where the
/// same weight would just look muddy.
class CoverScrim extends StatelessWidget {
  const CoverScrim({super.key});

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: [0.0, 0.5, 1.0],
          colors: [Color(0x33000000), Color(0x22000000), Color(0xB3000000)],
        ),
      ),
      child: SizedBox.expand(),
    );
  }
}

class _OnImageChip extends StatelessWidget {
  const _OnImageChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: context.texts.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _OnImageLine extends StatelessWidget {
  const _OnImageLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.white.withValues(alpha: 0.85)),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.texts.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ),
      ],
    );
  }
}
