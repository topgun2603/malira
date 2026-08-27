import 'package:cloud_firestore/cloud_firestore.dart';

import '../firestore_refs.dart';
import '../models/article.dart';

/// One page of the feed, plus the cursor to continue from.
class FeedPage {
  const FeedPage({required this.articles, required this.cursor});

  final List<Article> articles;

  /// Null when the feed is exhausted.
  final Doc? cursor;

  bool get hasMore => cursor != null;
}

/// The reader-facing queries.
///
/// A deliberate mirror of `web-admin/src/lib/api/public-news.ts`, down to the
/// page size and the sort. Those queries never look at anything but
/// `status == "published"`, which keeps "could an unpublished story reach a
/// reader" answerable by reading one short file — and there should be one such
/// file per client, not one shared guess.
///
/// The composite indexes these need are already deployed from
/// `web-admin/firestore.indexes.json`; the app adds no query shape that is not
/// already indexed there.
class NewsRepository {
  NewsRepository(this._refs);

  final Refs _refs;

  static const _published = 'published';

  /// Categories drive the feed rail. Live, because a section added by the desk
  /// should appear without the reader restarting the app.
  Stream<List<Category>> watchCategories() {
    return _refs.categories
        .orderBy('order')
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(Category.fromDoc)
              .where((category) => category.active)
              .toList(growable: false),
        );
  }

  /// A page of published stories, newest first.
  ///
  /// Paged rather than a flat limit. The web app learned this the hard way: a
  /// flat limit of 40 made story 41 unreachable the day it was published,
  /// findable only by someone who already had the link.
  Future<FeedPage> feedPage({
    String categoryId = 'all',
    int pageSize = 12,
    Doc? after,
    String? month,
  }) async {
    Query$ query = _refs.articles.where('status', isEqualTo: _published);

    if (categoryId != 'all') {
      query = query.where('categoryId', isEqualTo: categoryId);
    }

    if (month != null) {
      final parts = month.split('-');
      final year = int.parse(parts[0]);
      final monthNumber = int.parse(parts[1]);
      query = query
          .where(
            'publishedAt',
            isGreaterThanOrEqualTo: Timestamp.fromDate(
              DateTime(year, monthNumber, 1),
            ),
          )
          .where(
            'publishedAt',
            isLessThan: Timestamp.fromDate(DateTime(year, monthNumber + 1, 1)),
          );
    }

    query = query.orderBy('publishedAt', descending: true);
    if (after != null) query = query.startAfterDocument(after);

    final snapshot = await query.limit(pageSize).get();
    final articles = snapshot.docs.map(Article.fromDoc).toList();

    return FeedPage(
      articles: articles,
      // A short page means there is nothing after it.
      cursor: snapshot.docs.length == pageSize ? snapshot.docs.last : null,
    );
  }

  /// Pinned first, newest within each group.
  ///
  /// Sorted here rather than in the query, exactly as the web feed does it, so
  /// the pin does not cost a second composite index per category filter.
  static List<Article> sortPinnedFirst(List<Article> articles) {
    final sorted = [...articles];
    sorted.sort((a, b) {
      if (a.pinned != b.pinned) return a.pinned ? -1 : 1;
      final aTime = a.publishedAt?.millisecondsSinceEpoch ?? 0;
      final bTime = b.publishedAt?.millisecondsSinceEpoch ?? 0;
      return bTime.compareTo(aTime);
    });
    return sorted;
  }

  /// A single story.
  ///
  /// Returns null for anything not published. A direct link to a draft or a
  /// withdrawn story must come back empty even though the reader has the id —
  /// the same guard the web article route applies.
  Future<Article?> articleById(String id) async {
    final snapshot = await _refs.article(id).get();
    if (!snapshot.exists) return null;
    if (snapshot.data()?['status'] != _published) return null;
    return Article.fromDoc(snapshot);
  }

  Future<List<Article>> mostRead({int max = 5}) async {
    final snapshot = await _refs.articles
        .where('status', isEqualTo: _published)
        .orderBy('viewCount', descending: true)
        .limit(max)
        .get();
    return snapshot.docs.map(Article.fromDoc).toList();
  }

  /// More from the same section, minus the story being read.
  ///
  /// Over-fetches by one so removing the current story still leaves a full row.
  Future<List<Article>> related({
    required String categoryId,
    required String excludeId,
    int max = 4,
  }) async {
    if (categoryId.isEmpty) return const [];
    final snapshot = await _refs.articles
        .where('status', isEqualTo: _published)
        .where('categoryId', isEqualTo: categoryId)
        .orderBy('publishedAt', descending: true)
        .limit(max + 1)
        .get();

    return snapshot.docs
        .map(Article.fromDoc)
        .where((article) => article.id != excludeId)
        .take(max)
        .toList(growable: false);
  }

  /// Stories a specific carousel curated, in the editor's order.
  ///
  /// `whereIn` caps at 30 ids and the admin panel caps a carousel at 10, so one
  /// query always covers it. The result is re-ordered to match `ids` because
  /// Firestore returns `whereIn` results in its own order, and the whole point
  /// of a curated run is that somebody chose the sequence.
  Future<List<Article>> byIds(List<String> ids) async {
    if (ids.isEmpty) return const [];
    final snapshot = await _refs.articles
        .where(FieldPath.documentId, whereIn: ids.take(30).toList())
        .get();

    final found = {
      for (final doc in snapshot.docs)
        if (doc.data()['status'] == _published) doc.id: Article.fromDoc(doc),
    };

    return [
      for (final id in ids)
        if (found[id] != null) found[id]!,
    ];
  }

  /// Headline search.
  ///
  /// Firestore has no full-text index, so this filters a recent window on the
  /// device rather than pretending to search the whole archive. It is honest
  /// about its limit — [windowSize] stories back — and it costs one query.
  /// A real search needs an external index, which is a Phase 2 decision.
  Future<List<Article>> searchHeadlines(
    String term, {
    int windowSize = 300,
  }) async {
    final needle = term.trim().toLowerCase();
    if (needle.isEmpty) return const [];

    final snapshot = await _refs.articles
        .where('status', isEqualTo: _published)
        .orderBy('publishedAt', descending: true)
        .limit(windowSize)
        .get();

    return snapshot.docs
        .map(Article.fromDoc)
        .where(
          (article) =>
              article.title.toLowerCase().contains(needle) ||
              article.titleTa.contains(term.trim()) ||
              article.summary.toLowerCase().contains(needle) ||
              article.summaryTa.contains(term.trim()) ||
              article.tags.any((tag) => tag.toLowerCase().contains(needle)),
        )
        .toList(growable: false);
  }

  /// Months that actually contain published stories, newest first.
  Future<List<ArchiveMonth>> archiveMonths() async {
    final snapshot = await _refs.articles
        .where('status', isEqualTo: _published)
        .orderBy('publishedAt', descending: true)
        .limit(1000)
        .get();

    final counts = <String, int>{};
    for (final doc in snapshot.docs) {
      final published = doc.data()['publishedAt'];
      if (published is! Timestamp) continue;
      final date = published.toDate();
      final key =
          '${date.year}-${date.month.toString().padLeft(2, '0')}';
      counts[key] = (counts[key] ?? 0) + 1;
    }

    final keys = counts.keys.toList()..sort((a, b) => b.compareTo(a));
    return [
      for (final key in keys)
        ArchiveMonth(
          key: key,
          date: DateTime(
            int.parse(key.split('-')[0]),
            int.parse(key.split('-')[1]),
          ),
          count: counts[key]!,
        ),
    ];
  }
}

class ArchiveMonth {
  const ArchiveMonth({
    required this.key,
    required this.date,
    required this.count,
  });

  /// "YYYY-MM", the value the feed query takes.
  final String key;
  final DateTime date;
  final int count;
}
