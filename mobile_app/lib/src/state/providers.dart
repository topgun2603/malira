import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
// `Category` here is our model; foundation exports an annotation of the
// same name that would otherwise shadow it.
import 'package:flutter/foundation.dart' hide Category;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/firestore_refs.dart';
import '../data/models/article.dart';
import '../data/models/engagement.dart';
import '../data/models/event.dart';
import '../data/models/song.dart';
import '../data/repositories/engagement_repository.dart';
import '../data/repositories/events_repository.dart';
import '../data/repositories/news_repository.dart';
import '../data/repositories/push_repository.dart';
import '../data/repositories/songs_repository.dart';

/* -------------------------------------------------------------------------- */
/*  Wiring                                                                     */
/* -------------------------------------------------------------------------- */

final firestoreProvider = Provider<FirebaseFirestore>(
  (ref) => FirebaseFirestore.instance,
);

final refsProvider = Provider<Refs>(
  (ref) => Refs(ref.watch(firestoreProvider)),
);

final newsRepositoryProvider = Provider<NewsRepository>(
  (ref) => NewsRepository(ref.watch(refsProvider)),
);

final eventsRepositoryProvider = Provider<EventsRepository>(
  (ref) => EventsRepository(ref.watch(refsProvider)),
);

final songsRepositoryProvider = Provider<SongsRepository>(
  (ref) => SongsRepository(ref.watch(refsProvider)),
);

final engagementRepositoryProvider = Provider<EngagementRepository>(
  (ref) => EngagementRepository(ref.watch(refsProvider)),
);

final pushRepositoryProvider = Provider<PushRepository>(
  (ref) => PushRepository(
    FirebaseMessaging.instance,
    FlutterLocalNotificationsPlugin(),
  ),
);

/* -------------------------------------------------------------------------- */
/*  News                                                                       */
/* -------------------------------------------------------------------------- */

final categoriesProvider = StreamProvider<List<Category>>(
  (ref) => ref.watch(newsRepositoryProvider).watchCategories(),
);

/// Categories by id, for the card that needs to label one story.
final categoriesByIdProvider = Provider<Map<String, Category>>((ref) {
  final categories = ref.watch(categoriesProvider).value ?? const [];
  return {for (final category in categories) category.id: category};
});

/// Which section the feed is showing. `all` is not a category document — it is
/// the absence of a filter, same as the web rail.
class SelectedCategory extends Notifier<String> {
  @override
  String build() => 'all';

  void select(String categoryId) => state = categoryId;
}

final selectedCategoryProvider =
    NotifierProvider<SelectedCategory, String>(SelectedCategory.new);

/// The feed, as it currently stands on screen.
@immutable
class FeedState {
  const FeedState({
    required this.articles,
    required this.cursor,
    this.loadingMore = false,
  });

  final List<Article> articles;
  final Doc? cursor;
  final bool loadingMore;

  bool get hasMore => cursor != null;

  FeedState copyWith({
    List<Article>? articles,
    Doc? cursor,
    bool clearCursor = false,
    bool? loadingMore,
  }) {
    return FeedState(
      articles: articles ?? this.articles,
      cursor: clearCursor ? null : (cursor ?? this.cursor),
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

/// The paged feed for whichever category is selected.
///
/// Watching [selectedCategoryProvider] in `build` is what makes switching
/// sections work: the notifier is torn down and rebuilt with a fresh first
/// page, so there is no path where page 2 of Obituaries appends onto page 1 of
/// Sports.
class FeedNotifier extends AsyncNotifier<FeedState> {
  static const _pageSize = 12;

  late String _categoryId;

  @override
  Future<FeedState> build() async {
    _categoryId = ref.watch(selectedCategoryProvider);

    final page = await ref
        .read(newsRepositoryProvider)
        .feedPage(categoryId: _categoryId, pageSize: _pageSize);

    return FeedState(
      articles: NewsRepository.sortPinnedFirst(page.articles),
      cursor: page.cursor,
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;

    state = AsyncData(current.copyWith(loadingMore: true));

    try {
      final page = await ref
          .read(newsRepositoryProvider)
          .feedPage(
            categoryId: _categoryId,
            pageSize: _pageSize,
            after: current.cursor,
          );

      // Later pages are appended in publish order and deliberately not
      // re-sorted: a pinned story belongs at the top of the feed, not at the
      // top of page 3, where it would look like a bug.
      state = AsyncData(
        FeedState(
          articles: [...current.articles, ...page.articles],
          cursor: page.cursor,
        ),
      );
    } catch (_) {
      // Keep what is already on screen — a failed "load more" must not empty
      // the feed the reader is part-way through.
      state = AsyncData(current.copyWith(loadingMore: false));
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

final feedProvider = AsyncNotifierProvider<FeedNotifier, FeedState>(
  FeedNotifier.new,
);

/// Auto-disposing: one provider per article id would otherwise be kept alive
/// for the life of the app, and a reader gets through a lot of stories.
final articleProvider = FutureProvider.autoDispose.family<Article?, String>(
  (ref, id) => ref.watch(newsRepositoryProvider).articleById(id),
);

/// Keyed by a record rather than by the [Article] itself.
///
/// Records compare structurally; `Article` does not override `==`, so keying on
/// the object would mint a fresh provider every time the same story was
/// re-fetched into a new instance.
typedef RelatedKey = ({String categoryId, String excludeId});

final relatedArticlesProvider =
    FutureProvider.autoDispose.family<List<Article>, RelatedKey>((ref, key) {
      return ref.watch(newsRepositoryProvider).related(
        categoryId: key.categoryId,
        excludeId: key.excludeId,
      );
    });

final mostReadProvider = FutureProvider<List<Article>>(
  (ref) => ref.watch(newsRepositoryProvider).mostRead(),
);

final archiveMonthsProvider = FutureProvider<List<ArchiveMonth>>(
  (ref) => ref.watch(newsRepositoryProvider).archiveMonths(),
);

/// Live search over a recent window. Empty term returns nothing rather than
/// everything — a search box that dumps the whole feed the moment it is focused
/// reads as broken.
final searchResultsProvider =
    FutureProvider.autoDispose.family<List<Article>, String>((ref, term) {
      if (term.trim().length < 2) return Future.value(const []);
      return ref.watch(newsRepositoryProvider).searchHeadlines(term);
    });

/* -------------------------------------------------------------------------- */
/*  Events                                                                     */
/* -------------------------------------------------------------------------- */

final eventsProvider = StreamProvider<List<EventItem>>(
  (ref) => ref.watch(eventsRepositoryProvider).watchPublished(),
);

/// Upcoming and past, split on the device.
///
/// An event that ended this morning should leave the upcoming list before the
/// admin archive sweep next runs; a festival that began yesterday and runs
/// three days should not.
final splitEventsProvider = Provider<({List<EventItem> upcoming, List<EventItem> past})>(
  (ref) {
    final events = ref.watch(eventsProvider).value ?? const [];
    final upcoming = <EventItem>[];
    final past = <EventItem>[];
    for (final event in events) {
      (event.isPast ? past : upcoming).add(event);
    }
    // The list arrives soonest-first, which is right for upcoming and backwards
    // for past — somebody looking at what has happened wants the most recent.
    return (upcoming: upcoming, past: past.reversed.toList(growable: false));
  },
);

final eventProvider = FutureProvider.autoDispose.family<EventItem?, String>(
  (ref, id) => ref.watch(eventsRepositoryProvider).eventById(id),
);

/* -------------------------------------------------------------------------- */
/*  Songs                                                                      */
/* -------------------------------------------------------------------------- */

final playlistsProvider = StreamProvider<List<Playlist>>(
  (ref) => ref.watch(songsRepositoryProvider).watchPlaylists(),
);

final songsProvider = StreamProvider<List<Song>>(
  (ref) => ref.watch(songsRepositoryProvider).watchSongs(),
);

final newReleasesProvider = FutureProvider<List<Song>>(
  (ref) => ref.watch(songsRepositoryProvider).newReleases(),
);

final playlistSongsProvider =
    StreamProvider.autoDispose.family<List<Song>, String>(
      (ref, playlistId) =>
          ref.watch(songsRepositoryProvider).watchPlaylistSongs(playlistId),
    );

/* -------------------------------------------------------------------------- */
/*  Engagement                                                                 */
/* -------------------------------------------------------------------------- */

final activePollProvider = FutureProvider.family<Poll?, String>(
  (ref, surface) =>
      ref.watch(engagementRepositoryProvider).activePoll(surface: surface),
);

final adForSlotProvider = FutureProvider.family<Ad?, FeedSlot>(
  (ref, slot) => ref.watch(engagementRepositoryProvider).adForSlot(slot),
);

final carouselForSlotProvider =
    FutureProvider.family<StoryCarousel?, FeedSlot>(
      (ref, slot) =>
          ref.watch(engagementRepositoryProvider).carouselForSlot(slot),
    );

/// The stories a carousel curated, resolved and kept in the editor's order.
final carouselArticlesProvider =
    FutureProvider.family<List<Article>, FeedSlot>((ref, slot) async {
      final carousel = await ref.watch(carouselForSlotProvider(slot).future);
      if (carousel == null || carousel.articleIds.isEmpty) return const [];
      return ref.watch(newsRepositoryProvider).byIds(carousel.articleIds);
    });

final appSettingsProvider = FutureProvider<AppSettings>(
  (ref) => ref.watch(engagementRepositoryProvider).appSettings(),
);
