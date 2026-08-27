import 'package:cloud_firestore/cloud_firestore.dart';

import 'parsing.dart';

/// An image on a story. Mirrors `ArticleImage` in the admin panel.
class ArticleImage {
  const ArticleImage({
    required this.url,
    required this.width,
    required this.height,
    this.path = '',
    this.caption = '',
  });

  factory ArticleImage.fromMap(Map<String, dynamic> data) => ArticleImage(
    url: data.str('url'),
    path: data.str('path'),
    width: data.integer('width'),
    height: data.integer('height'),
    caption: data.str('caption'),
  );

  final String url;

  /// Where the object lives in Storage, e.g. `matrimony/{uid}/abc.webp`.
  ///
  /// The reader never needs this — a download URL is enough to render — but
  /// removing a photograph does: without the path there is no way to delete the
  /// object, only to stop pointing at it, which would leave every discarded
  /// photo sitting in the bucket forever.
  final String path;

  final int width;
  final int height;
  final String caption;

  /// Used to size the placeholder before the bytes arrive, so the feed does not
  /// jump as images load.
  double get aspectRatio =>
      (width > 0 && height > 0) ? width / height : 16 / 9;

  Map<String, dynamic> toMap() => {
    'url': url,
    'path': path,
    'width': width,
    'height': height,
    'caption': caption,
  };
}

/// A feed section. Order drives the category rail, exactly as the comment on
/// `Category.order` in the admin panel says it should.
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.nameTa,
    required this.slug,
    required this.order,
    required this.active,
  });

  factory Category.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const {};
    return Category(
      id: doc.id,
      name: data.str('name'),
      nameTa: data.str('nameTa'),
      slug: data.str('slug'),
      order: data.integer('order'),
      active: data.flag('active', true),
    );
  }

  final String id;
  final String name;
  final String nameTa;
  final String slug;
  final int order;
  final bool active;

  /// A death notice must not be styled like a match report. The web feed keys
  /// this off the slug and so does the app, so a category renamed in the admin
  /// panel keeps its treatment.
  bool get isObituary => slug == 'obituaries';
}

/// A published story.
///
/// Only ever constructed from a document with `status == "published"` — see
/// [NewsRepository]. The editorial fields (review notes, scheduling, the
/// author's uid) are not modelled at all: the app cannot use them and a reader
/// build has no business carrying them.
class Article {
  const Article({
    required this.id,
    required this.title,
    required this.titleTa,
    required this.summary,
    required this.summaryTa,
    required this.body,
    required this.bodyTa,
    required this.categoryId,
    required this.tags,
    required this.images,
    required this.youtubeUrl,
    required this.sourceName,
    required this.authorName,
    required this.createdByName,
    required this.pinned,
    required this.publishedAt,
    required this.viewCount,
    required this.shareCount,
  });

  factory Article.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Article(
      id: doc.id,
      title: data.str('title'),
      titleTa: data.str('titleTa'),
      summary: data.str('summary'),
      summaryTa: data.str('summaryTa'),
      body: data.str('body'),
      bodyTa: data.str('bodyTa'),
      categoryId: data.str('categoryId'),
      tags: data.strings('tags'),
      images: data
          .maps('images')
          .map(ArticleImage.fromMap)
          .toList(growable: false),
      youtubeUrl: data.strOrNull('youtubeUrl'),
      sourceName: data.str('sourceName'),
      authorName: data.str('authorName'),
      createdByName: data.str('createdByName'),
      pinned: data.flag('pinned'),
      publishedAt: data.time('publishedAt'),
      viewCount: data.integer('viewCount'),
      shareCount: data.integer('shareCount'),
    );
  }

  /// Rebuilt from the on-device bookmark cache, which is why the shape below is
  /// also what [toCache] writes.
  factory Article.fromCache(Map<String, dynamic> data) => Article(
    id: data.str('id'),
    title: data.str('title'),
    titleTa: data.str('titleTa'),
    summary: data.str('summary'),
    summaryTa: data.str('summaryTa'),
    body: data.str('body'),
    bodyTa: data.str('bodyTa'),
    categoryId: data.str('categoryId'),
    tags: data.strings('tags'),
    images: data.maps('images').map(ArticleImage.fromMap).toList(growable: false),
    youtubeUrl: data.strOrNull('youtubeUrl'),
    sourceName: data.str('sourceName'),
    authorName: data.str('authorName'),
    createdByName: data.str('createdByName'),
    pinned: data.flag('pinned'),
    publishedAt: data['publishedAt'] is int
        ? DateTime.fromMillisecondsSinceEpoch(data['publishedAt'] as int)
        : null,
    viewCount: data.integer('viewCount'),
    shareCount: data.integer('shareCount'),
  );

  final String id;
  final String title;
  final String titleTa;
  final String summary;
  final String summaryTa;

  /// Tiptap HTML from the admin editor.
  final String body;
  final String bodyTa;

  final String categoryId;
  final List<String> tags;
  final List<ArticleImage> images;
  final String? youtubeUrl;
  final String sourceName;
  final String authorName;
  final String createdByName;
  final bool pinned;
  final DateTime? publishedAt;
  final int viewCount;
  final int shareCount;

  ArticleImage? get leadImage => images.isEmpty ? null : images.first;
  bool get hasVideo => (youtubeUrl ?? '').isNotEmpty;

  /// The byline the desk wants shown: an explicit author, else whoever filed
  /// it. Same precedence as the web feed card.
  String get byline => authorName.isNotEmpty ? authorName : createdByName;

  Map<String, dynamic> toCache() => {
    'id': id,
    'title': title,
    'titleTa': titleTa,
    'summary': summary,
    'summaryTa': summaryTa,
    'body': body,
    'bodyTa': bodyTa,
    'categoryId': categoryId,
    'tags': tags,
    'images': images.map((image) => image.toMap()).toList(),
    'youtubeUrl': youtubeUrl,
    'sourceName': sourceName,
    'authorName': authorName,
    'createdByName': createdByName,
    'pinned': pinned,
    'publishedAt': publishedAt?.millisecondsSinceEpoch,
    'viewCount': viewCount,
    'shareCount': shareCount,
  };
}
