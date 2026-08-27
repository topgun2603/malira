import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../firestore_refs.dart';
import '../models/engagement.dart';

/// Where an ad or a carousel may appear.
///
/// The admin panel has web-shaped slots (sidebars, popups) that a phone has no
/// room for. Only the slots that make sense on a single column are modelled
/// here; anything else the desk schedules simply does not render in the app,
/// which is better than inventing a place to put it.
enum FeedSlot {
  homeTop('home_top'),
  homeFeed('home_feed'),
  articleTop('article_top'),
  articleEnd('article_end');

  const FeedSlot(this.id);
  final String id;
}

/// Polls, ads, carousels and app settings.
class EngagementRepository {
  EngagementRepository(this._refs, {Random? random})
    : _random = random ?? Random();

  final Refs _refs;
  final Random _random;

  /// The poll the desk wants on this surface. `placement` is `sidebar`,
  /// `article` or `both` in the admin panel; the app treats its feed as the
  /// sidebar equivalent, since that is where a phone reader meets it.
  Future<Poll?> activePoll({required String surface}) async {
    final snapshot = await _refs.polls
        .where('status', isEqualTo: 'active')
        .where('placement', whereIn: [surface, 'both'])
        .limit(1)
        .get();
    if (snapshot.docs.isEmpty) return null;
    return Poll.fromDoc(snapshot.docs.first);
  }

  /// Cast a vote.
  ///
  /// Written as the exact diff `firestore.rules` permits from an unauthenticated
  /// client: `counts` and `totalVotes` only, and `totalVotes` up by exactly one.
  /// Anything else — including a second field slipped in later — is rejected by
  /// the server, not by this method.
  Future<void> castVote({
    required String pollId,
    required String optionId,
  }) async {
    await _refs.poll(pollId).update({
      'counts.$optionId': FieldValue.increment(1),
      'totalVotes': FieldValue.increment(1),
    });
  }

  /// One ad for a slot, weighted.
  ///
  /// Only `status == "active"` documents are readable, and the flight window is
  /// then checked on the device because the rules gate on status rather than on
  /// dates.
  Future<Ad?> adForSlot(FeedSlot slot) async {
    final snapshot = await _refs.ads
        .where('status', isEqualTo: 'active')
        .where('placement', isEqualTo: slot.id)
        .get();

    final live = snapshot.docs
        .map(Ad.fromDoc)
        .where((ad) => ad.isLive)
        .toList(growable: false);
    if (live.isEmpty) return null;

    // Weighted pick: an ad with weight 3 comes up three times as often as one
    // with weight 1. A zero or negative weight is treated as 1 rather than
    // making the ad unservable, since that is almost certainly a typo in the
    // admin form rather than an instruction.
    final weights = live.map((ad) => max(1, ad.weight)).toList(growable: false);
    final total = weights.reduce((a, b) => a + b);
    var ticket = _random.nextInt(total);
    for (var index = 0; index < live.length; index++) {
      ticket -= weights[index];
      if (ticket < 0) return live[index];
    }
    return live.last;
  }

  /// Record that an ad was shown, or clicked.
  ///
  /// Best-effort. The rules allow an unauthenticated increment of at most one,
  /// and if the write is refused the reader must never see it — an advertiser's
  /// counter is not worth an error dialog in a news app.
  Future<void> recordAdImpression(String id) async {
    try {
      await _refs.ads.doc(id).update({'impressions': FieldValue.increment(1)});
    } catch (_) {
      // Counting is not the reason the reader opened the app.
    }
  }

  Future<void> recordAdClick(String id) async {
    try {
      await _refs.ads.doc(id).update({'clicks': FieldValue.increment(1)});
    } catch (_) {
      // As above.
    }
  }

  /// The active carousel for a slot, if the desk has curated one.
  Future<StoryCarousel?> carouselForSlot(FeedSlot slot) async {
    final snapshot = await _refs.carousels
        .where('status', isEqualTo: 'active')
        .where('placement', isEqualTo: slot.id)
        .limit(1)
        .get();
    if (snapshot.docs.isEmpty) return null;
    return StoryCarousel.fromDoc(snapshot.docs.first);
  }

  /// `settings/app`. Public by rule, because the app reads the minimum-version
  /// and force-update flags before anyone has an account.
  Future<AppSettings> appSettings() async {
    final snapshot = await _refs.appSettings.get();
    if (!snapshot.exists) return AppSettings.empty;
    return AppSettings.fromDoc(snapshot);
  }
}
