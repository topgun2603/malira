import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/parsing.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/states.dart';
import 'widgets/masthead.dart';

/// One announcement the desk has sent.
class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.titleTa,
    required this.body,
    required this.bodyTa,
    required this.targetType,
    required this.targetId,
    required this.sentAt,
  });

  factory Announcement.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Announcement(
      id: doc.id,
      title: data.str('title'),
      titleTa: data.str('titleTa'),
      body: data.str('body'),
      bodyTa: data.str('bodyTa'),
      targetType: data.str('targetType', 'none'),
      targetId: data.strOrNull('targetId'),
      sentAt: data.time('sentAt') ?? data.time('createdAt'),
    );
  }

  final String id;
  final String title;
  final String titleTa;
  final String body;
  final String bodyTa;
  final String targetType;
  final String? targetId;
  final DateTime? sentAt;

  /// Where tapping it should go, matching the deep link in the push itself.
  String? get route {
    final id = targetId;
    if (id == null || id.isEmpty) return null;
    return switch (targetType) {
      'article' => '/article/$id',
      'event' => '/event/$id',
      'song' => '/songs',
      _ => null,
    };
  }
}

/// Announcements that actually went out.
///
/// Only `sent` — a queued message is not yet news, and a draft the desk is
/// still wording has no business on a reader's phone. The same rule the feed
/// applies to unpublished stories.
final announcementsProvider = StreamProvider<List<Announcement>>((ref) {
  return ref
      .watch(refsProvider)
      .notifications
      .where('status', isEqualTo: 'sent')
      .orderBy('sentAt', descending: true)
      .limit(50)
      .snapshots()
      .map((snapshot) => snapshot.docs.map(Announcement.fromDoc).toList());
});

/// How many arrived since the reader last opened this screen.
final unreadAnnouncementsProvider = Provider<int>((ref) {
  final seenAt = ref.watch(
    preferencesProvider.select((p) => p.announcementsSeenAt),
  );
  final all = ref.watch(announcementsProvider).value ?? const [];
  if (seenAt == null) return all.length;
  return all
      .where((entry) => (entry.sentAt ?? DateTime(0)).isAfter(seenAt))
      .length;
});

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  @override
  void initState() {
    super.initState();
    // Opening the screen is what marks them read; there is no per-item state to
    // keep and nothing to sync, which suits an audience that will never think
    // about a badge.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(preferencesProvider.notifier).markAnnouncementsSeen();
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final announcements = ref.watch(announcementsProvider);

    return Scaffold(
      appBar: PageAppBar(title: strings.notifications),
      body: switch (announcements) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(announcementsProvider),
        ),
        AsyncData(:final value) when value.isEmpty => EmptyState(
          icon: Icons.notifications_none,
          title: strings.noNotifications,
          body: strings.noNotificationsBody,
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: Gap.sm),
          itemCount: value.length,
          separatorBuilder: (context, index) =>
              Divider(color: context.brand.border, height: 1),
          itemBuilder: (context, index) {
            final item = value[index];
            final route = item.route;

            return InkWell(
              onTap: route == null ? null : () => context.push(route),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Gap.page,
                  vertical: Gap.lg,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 36,
                      width: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: context.scheme.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        switch (item.targetType) {
                          'article' => Icons.article_outlined,
                          'event' => Icons.event_outlined,
                          'song' => Icons.music_note_outlined,
                          _ => Icons.campaign_outlined,
                        },
                        size: 18,
                        color: context.scheme.primary,
                      ),
                    ),
                    const SizedBox(width: Gap.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            strings.pick(item.title, item.titleTa),
                            style: context.texts.titleSmall,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            strings.pick(item.body, item.bodyTa),
                            style: context.texts.bodyMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            Dates.relative(item.sentAt, strings),
                            style: context.texts.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    if (route != null)
                      Icon(
                        Icons.chevron_right,
                        size: 18,
                        color: context.brand.mutedForeground,
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      },
    );
  }
}

/// The bell, with a count of what arrived since the reader last looked.
class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key, this.color});

  final Color? color;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadAnnouncementsProvider);
    final strings = ref.watch(stringsProvider);

    return IconButton(
      tooltip: strings.notifications,
      color: color,
      onPressed: () => context.push('/notifications'),
      icon: Badge(
        isLabelVisible: unread > 0,
        // Capped: past a point the number stops being information and starts
        // being a reproach.
        label: Text(unread > 9 ? '9+' : '$unread'),
        backgroundColor: context.brand.saffron,
        child: const Icon(Icons.notifications_none),
      ),
    );
  }
}
