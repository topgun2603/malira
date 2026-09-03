import 'package:cloud_firestore/cloud_firestore.dart';

import 'article.dart';
import 'parsing.dart';

/// One answer on a poll.
class PollOption {
  const PollOption({required this.id, required this.label, required this.labelTa});

  factory PollOption.fromMap(Map<String, dynamic> data) => PollOption(
    id: data.str('id'),
    label: data.str('label'),
    labelTa: data.str('labelTa'),
  );

  final String id;
  final String label;
  final String labelTa;
}

/// A community poll.
///
/// Votes are unauthenticated by design — the Firestore rule boxes the write
/// down to a single increment on `counts` and `totalVotes` rather than
/// demanding an account, because requiring sign-in to answer a community poll
/// would kill participation. The app records locally which polls this device
/// has answered; that is a courtesy to the reader, not a security control, and
/// the rule is what actually holds.
class Poll {
  const Poll({
    required this.id,
    required this.question,
    required this.questionTa,
    required this.options,
    required this.counts,
    required this.totalVotes,
    required this.isOpen,
    required this.closesAt,
  });

  factory Poll.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Poll(
      id: doc.id,
      question: data.str('question'),
      questionTa: data.str('questionTa'),
      options: data.maps('options').map(PollOption.fromMap).toList(growable: false),
      counts: data.counts('counts'),
      totalVotes: data.integer('totalVotes'),
      isOpen: data.str('status') == 'active',
      closesAt: data.time('closesAt'),
    );
  }

  final String id;
  final String question;
  final String questionTa;
  final List<PollOption> options;
  final Map<String, int> counts;
  final int totalVotes;
  final bool isOpen;
  final DateTime? closesAt;

  int votesFor(String optionId) => counts[optionId] ?? 0;

  double shareFor(String optionId) =>
      totalVotes == 0 ? 0 : votesFor(optionId) / totalVotes;
}

/// A running ad.
///
/// Only `status == "active"` documents are readable at all, so an [Ad] instance
/// is by construction one that is meant to be on screen.
class Ad {
  const Ad({
    required this.id,
    required this.advertiser,
    required this.headline,
    required this.headlineTa,
    required this.body,
    required this.bodyTa,
    required this.ctaLabel,
    required this.ctaUrl,
    required this.image,
    required this.weight,
    required this.startsAt,
    required this.endsAt,
  });

  factory Ad.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    final image = data['image'];
    return Ad(
      id: doc.id,
      advertiser: data.str('advertiser'),
      headline: data.str('headline'),
      headlineTa: data.str('headlineTa'),
      body: data.str('body'),
      bodyTa: data.str('bodyTa'),
      ctaLabel: data.str('ctaLabel'),
      ctaUrl: data.str('ctaUrl'),
      image: image is Map
          ? ArticleImage.fromMap(image.cast<String, dynamic>())
          : null,
      weight: data.integer('weight', 1),
      startsAt: data.time('startsAt'),
      endsAt: data.time('endsAt'),
    );
  }

  final String id;
  final String advertiser;
  final String headline;
  final String headlineTa;
  final String body;
  final String bodyTa;
  final String ctaLabel;
  final String ctaUrl;
  final ArticleImage? image;

  /// Higher wins more often when several ads compete for one slot.
  final int weight;

  final DateTime? startsAt;
  final DateTime? endsAt;

  /// The flight window. Firestore rules gate on `status`, not on dates, so this
  /// is checked client-side exactly as the web reader does.
  bool get isLive {
    final now = DateTime.now();
    if (startsAt != null && now.isBefore(startsAt!)) return false;
    if (endsAt != null && now.isAfter(endsAt!)) return false;
    return true;
  }
}

/// A hand-picked run of stories. Not a query — an editor chose these, in this
/// order, and the app must not re-sort them.
class StoryCarousel {
  const StoryCarousel({
    required this.id,
    required this.title,
    required this.titleTa,
    required this.articleIds,
    required this.autoplay,
    required this.intervalSeconds,
  });

  factory StoryCarousel.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return StoryCarousel(
      id: doc.id,
      title: data.str('title'),
      titleTa: data.str('titleTa'),
      articleIds: data.strings('articleIds'),
      autoplay: data.flag('autoplay'),
      intervalSeconds: data.integer('intervalSeconds', 6),
    );
  }

  final String id;
  final String title;
  final String titleTa;
  final List<String> articleIds;
  final bool autoplay;
  final int intervalSeconds;
}

/// `settings/app` — the one settings document the rules expose publicly,
/// because the app reads the force-update flags before anyone signs in.
class AppSettings {
  const AppSettings({
    required this.aboutTitle,
    required this.aboutBody,
    required this.aboutBodyTa,
    required this.contactEmail,
    required this.contactPhone,
    required this.contactAddress,
    required this.subscribeUrl,
    required this.minAndroidVersion,
    required this.forceUpdate,
    required this.updateMessage,
    required this.playStoreUrl,
  });

  factory AppSettings.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return AppSettings(
      aboutTitle: data.str('aboutTitle', 'About Badaga Matrimony'),
      aboutBody: data.str('aboutBody'),
      aboutBodyTa: data.str('aboutBodyTa'),
      contactEmail: data.str('contactEmail'),
      contactPhone: data.str('contactPhone'),
      contactAddress: data.str('contactAddress'),
      subscribeUrl: data.str('subscribeUrl'),
      minAndroidVersion: data.integer('minAndroidVersion', 1),
      forceUpdate: data.flag('forceUpdate'),
      updateMessage: data.str(
        'updateMessage',
        'A newer version of the app is available.',
      ),
      playStoreUrl: data.str('playStoreUrl'),
    );
  }

  static const empty = AppSettings(
    aboutTitle: 'About Badaga Matrimony',
    aboutBody: '',
    aboutBodyTa: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    subscribeUrl: '',
    minAndroidVersion: 1,
    forceUpdate: false,
    updateMessage: 'A newer version of the app is available.',
    playStoreUrl: '',
  );

  final String aboutTitle;
  final String aboutBody;
  final String aboutBodyTa;
  final String contactEmail;
  final String contactPhone;
  final String contactAddress;

  /// Where to send somebody who wants to subscribe.
  ///
  /// The app cannot sell a plan: Play requires Play Billing for anything bought
  /// inside an app, at 15-30%, so purchases are web-only. Browsing needs a plan,
  /// so without this the wall has no door.
  final String subscribeUrl;
  final int minAndroidVersion;
  final bool forceUpdate;
  final String updateMessage;
  final String playStoreUrl;
}
