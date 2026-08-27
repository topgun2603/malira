import 'package:flutter_test/flutter_test.dart';
import 'package:nilgiri_news/src/core/l10n/strings.dart';
import 'package:nilgiri_news/src/core/youtube.dart';
import 'package:nilgiri_news/src/data/models/article.dart';
import 'package:nilgiri_news/src/data/repositories/news_repository.dart';

/// The rules that would be silently wrong rather than loudly broken.
///
/// None of these need Firebase. They cover the three places where the app makes
/// a decision the reader would notice and nobody would get a stack trace for:
/// which language a field is shown in, what order the feed is in, and whether a
/// pasted video link is understood.
void main() {
  group('bilingual fallback', () {
    const english = Strings(ReaderLanguage.en);
    const tamil = Strings(ReaderLanguage.ta);

    test('English reader always gets the English field', () {
      expect(english.pick('Landslide at Coonoor', 'கூடலூரில் நிலச்சரிவு'),
          'Landslide at Coonoor');
    });

    test('Tamil reader gets Tamil when it is filled', () {
      expect(tamil.pick('Landslide at Coonoor', 'கூடலூரில் நிலச்சரிவு'),
          'கூடலூரில் நிலச்சரிவு');
    });

    test('Tamil reader falls back to English rather than showing a blank', () {
      // This is the whole reason stories may be published English-only.
      expect(tamil.pick('Landslide at Coonoor', ''), 'Landslide at Coonoor');
    });

    test('whitespace-only Tamil counts as absent', () {
      // An editor who tabbed through the Tamil field and left a space has not
      // translated the story.
      expect(tamil.pick('Landslide at Coonoor', '   '), 'Landslide at Coonoor');
    });

    test('reports which language was actually used', () {
      expect(tamil.pickedLanguage('Headline', ''), ReaderLanguage.en);
      expect(tamil.pickedLanguage('Headline', 'தலைப்பு'), ReaderLanguage.ta);
    });
  });

  group('feed order', () {
    Article at(String id, {required int day, bool pinned = false}) {
      return Article(
        id: id,
        title: id,
        titleTa: '',
        summary: '',
        summaryTa: '',
        body: '',
        bodyTa: '',
        categoryId: 'news',
        tags: const [],
        images: const [],
        youtubeUrl: null,
        sourceName: '',
        authorName: '',
        createdByName: '',
        pinned: pinned,
        publishedAt: DateTime(2026, 3, day),
        viewCount: 0,
        shareCount: 0,
      );
    }

    test('pinned stories lead, newest first within each group', () {
      final sorted = NewsRepository.sortPinnedFirst([
        at('old', day: 1),
        at('newest', day: 9),
        at('pinned-old', day: 2, pinned: true),
        at('pinned-new', day: 8, pinned: true),
      ]);

      expect(
        sorted.map((article) => article.id),
        ['pinned-new', 'pinned-old', 'newest', 'old'],
      );
    });

    test('a story with no publish date sorts last rather than crashing', () {
      final undated = Article(
        id: 'undated',
        title: '',
        titleTa: '',
        summary: '',
        summaryTa: '',
        body: '',
        bodyTa: '',
        categoryId: 'news',
        tags: const [],
        images: const [],
        youtubeUrl: null,
        sourceName: '',
        authorName: '',
        createdByName: '',
        pinned: false,
        publishedAt: null,
        viewCount: 0,
        shareCount: 0,
      );

      final sorted = NewsRepository.sortPinnedFirst([undated, at('dated', day: 4)]);
      expect(sorted.first.id, 'dated');
    });
  });

  group('YouTube links', () {
    test('accepts every shape the admin panel accepts', () {
      const cases = {
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'https://www.youtube.com/live/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
        'dQw4w9WgXcQ': 'dQw4w9WgXcQ',
      };

      cases.forEach((url, expected) {
        expect(YouTube.extractId(url), expected, reason: url);
      });
    });

    test('rejects what is not a YouTube link', () {
      expect(YouTube.extractId(''), isNull);
      expect(YouTube.extractId(null), isNull);
      expect(YouTube.extractId('https://example.com/video'), isNull);
      // Ten characters, not eleven.
      expect(YouTube.extractId('dQw4w9WgXc'), isNull);
    });

    test('derives the thumbnail and watch URL from the id', () {
      expect(
        YouTube.thumbnail('dQw4w9WgXcQ'),
        'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );
      expect(
        YouTube.watchUri('dQw4w9WgXcQ').toString(),
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
    });
  });

  group('article cache round-trip', () {
    test('a saved story survives being written to disk and read back', () {
      final original = Article(
        id: 'story-1',
        title: 'Tea auction prices hold',
        titleTa: 'தேயிலை ஏல விலை நிலையானது',
        summary: 'Coonoor auction closes steady.',
        summaryTa: '',
        body: '<p>Body copy.</p>',
        bodyTa: '',
        categoryId: 'business',
        tags: const ['tea', 'auction'],
        images: const [
          ArticleImage(url: 'https://example.com/a.jpg', width: 1600, height: 900),
        ],
        youtubeUrl: null,
        sourceName: 'Desk',
        authorName: 'R. Kumar',
        createdByName: 'Editor',
        pinned: true,
        publishedAt: DateTime(2026, 3, 14, 9, 30),
        viewCount: 42,
        shareCount: 3,
      );

      final restored = Article.fromCache(original.toCache());

      expect(restored.id, original.id);
      expect(restored.titleTa, original.titleTa);
      expect(restored.body, original.body);
      expect(restored.tags, original.tags);
      expect(restored.images.single.url, original.images.single.url);
      expect(restored.pinned, isTrue);
      expect(restored.publishedAt, original.publishedAt);
      expect(restored.byline, 'R. Kumar');
    });

    test('byline falls back to whoever filed the story', () {
      final filed = Article.fromCache({
        'id': 'x',
        'authorName': '',
        'createdByName': 'S. Bellie',
      });
      expect(filed.byline, 'S. Bellie');
    });
  });
}
