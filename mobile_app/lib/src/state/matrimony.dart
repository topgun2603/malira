import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/matrimony.dart';
import '../data/repositories/matrimony_repository.dart';
import '../data/repositories/photo_repository.dart';
import 'auth.dart';
import 'providers.dart';

final matrimonyRepositoryProvider = Provider<MatrimonyRepository>(
  (ref) => MatrimonyRepository(ref.watch(refsProvider)),
);

final photoRepositoryProvider = Provider<PhotoRepository>(
  (ref) => PhotoRepository(FirebaseStorage.instance),
);

/// The browse filters currently applied.
class MatrimonyFilterNotifier extends Notifier<MatrimonyFilters> {
  @override
  MatrimonyFilters build() => const MatrimonyFilters();

  void set(MatrimonyFilters filters) => state = filters;

  void clear() => state = const MatrimonyFilters();

  void setSearch(String term) => state = state.copyWith(search: term);
}

final matrimonyFiltersProvider =
    NotifierProvider<MatrimonyFilterNotifier, MatrimonyFilters>(
      MatrimonyFilterNotifier.new,
    );

/// Approved listings matching the current filters.
///
/// Watches the filters, so changing one re-runs the search. Also watches the
/// signed-in uid: nothing here is readable without an account, and a sign-out
/// must drop the results rather than leave somebody's date of birth on screen.
final matrimonySearchProvider = FutureProvider<List<MatrimonyProfile>>((
  ref,
) async {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return const [];

  final filters = ref.watch(matrimonyFiltersProvider);
  final results = await ref
      .watch(matrimonyRepositoryProvider)
      .search(filters);

  // Never show somebody their own listing in the browse results — it is not a
  // match, and seeing yourself in a list of candidates is a small absurdity
  // that makes the whole section feel unconsidered.
  final others = results
      .where((profile) => profile.id != uid)
      .toList(growable: false);

  // A free account sees a capped number of listings, the same truncation the
  // web browse applies. The cap is on what is *shown*, not on what was read —
  // matching the web exactly, including the fact that a determined reader could
  // see past it. Making it a real limit needs a server-side query, which is a
  // decision for the association rather than something to invent here.
  if (ref.watch(isPremiumProvider)) return others;

  final limits =
      ref.watch(matrimonyLimitsProvider).value ?? MatrimonyLimits.defaults;
  return others.take(limits.freeProfileViews).toList(growable: false);
});

/// One listing, by uid.
final matrimonyProfileProvider =
    StreamProvider.autoDispose.family<MatrimonyProfile?, String>((ref, uid) {
      return ref.watch(matrimonyRepositoryProvider).watchProfile(uid);
    });

/// The signed-in member's own listing, if they have one.
final myMatrimonyProfileProvider = StreamProvider<MatrimonyProfile?>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(null);
  return ref.watch(matrimonyRepositoryProvider).watchProfile(uid);
});

/// Contact details for one profile.
///
/// Returns null when this viewer has not earned them, which is the ordinary
/// case rather than an error.
final matrimonyContactProvider =
    FutureProvider.autoDispose.family<MatrimonyContact?, String>((ref, uid) {
      return ref.watch(matrimonyRepositoryProvider).contact(uid);
    });

final sentInterestsProvider = StreamProvider<List<MatrimonyInterest>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const []);
  return ref.watch(matrimonyRepositoryProvider).watchSent(uid);
});

final receivedInterestsProvider = StreamProvider<List<MatrimonyInterest>>((
  ref,
) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const []);
  return ref.watch(matrimonyRepositoryProvider).watchReceived(uid);
});

/// Every interest this account is party to, in either direction.
final allInterestsProvider = Provider<List<MatrimonyInterest>>((ref) {
  return [
    ...ref.watch(sentInterestsProvider).value ?? const [],
    ...ref.watch(receivedInterestsProvider).value ?? const [],
  ];
});

/// Received interests still waiting for an answer — the badge on the drawer.
final pendingInterestCountProvider = Provider<int>((ref) {
  final received = ref.watch(receivedInterestsProvider).value ?? const [];
  return received
      .where((interest) => interest.status == InterestStatus.sent)
      .length;
});

/// Accounts this member has matched with, for the "contact unlocked" state.
final matchedUidsProvider = Provider<Set<String>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return const {};
  return {
    for (final interest in ref.watch(allInterestsProvider))
      if (interest.status == InterestStatus.accepted) interest.otherUid(uid),
  };
});

final subscriptionProvider = FutureProvider<Subscription>((ref) async {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Subscription.none;
  return ref.watch(matrimonyRepositoryProvider).subscription(uid);
});

/// The free allowance the association configured, or the documented defaults.
final matrimonyLimitsProvider = FutureProvider<MatrimonyLimits>(
  (ref) => ref.watch(matrimonyRepositoryProvider).limits(),
);

final isPremiumProvider = Provider<bool>(
  (ref) => ref.watch(subscriptionProvider).value?.isPremium ?? false,
);

/// Interests left this month. Null means unlimited (a held plan).
final remainingInterestsProvider = Provider<int?>((ref) {
  final sent = ref.watch(sentInterestsProvider).value ?? const [];
  final limits =
      ref.watch(matrimonyLimitsProvider).value ?? MatrimonyLimits.defaults;
  return remainingInterests(
    sent,
    ref.watch(isPremiumProvider),
    limits.freeInterestsPerMonth,
  );
});

/// What this member may do about a given profile right now.
enum InterestState {
  /// No interest either way — the button is live.
  none,

  /// This member sent one and it is unanswered.
  sent,

  /// The other side sent one and it is waiting on this member.
  awaitingMyAnswer,

  /// Accepted in either direction. Contact details are unlocked.
  matched,

  /// The other side declined. The button stays down rather than inviting a
  /// second attempt at somebody who has already said no.
  ///
  /// Withdrawing does NOT land here: taking your own interest back is your
  /// decision, and it leaves you free to send again.
  closed,
}

/// Resolves [InterestState] for one profile.
final interestStateProvider = Provider.family<InterestState, String>((
  ref,
  otherUid,
) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return InterestState.none;

  final interests = ref.watch(allInterestsProvider);

  MatrimonyInterest? between(String from, String to) {
    for (final interest in interests) {
      if (interest.fromUid == from && interest.toUid == to) return interest;
    }
    return null;
  }

  final mine = between(uid, otherUid);
  final theirs = between(otherUid, uid);

  if (mine?.status == InterestStatus.accepted ||
      theirs?.status == InterestStatus.accepted) {
    return InterestState.matched;
  }
  if (theirs?.status == InterestStatus.sent) {
    return InterestState.awaitingMyAnswer;
  }
  if (mine?.status == InterestStatus.sent) return InterestState.sent;

  // Only *their* refusal closes the door. A withdrawn interest of my own is
  // reopenable, and one I declined from them does not stop me sending my own.
  if (mine?.status == InterestStatus.declined) return InterestState.closed;

  return InterestState.none;
});
