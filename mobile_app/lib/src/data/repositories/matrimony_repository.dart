import 'package:cloud_firestore/cloud_firestore.dart';

import '../firestore_refs.dart';
import '../models/article.dart';
import '../models/matrimony.dart';
import '../models/parsing.dart';

/// Filters the browse screen applies.
///
/// Gender is filtered in Firestore; age, diet, marital status and free text are
/// filtered on the returned page. Age is derived from a date of birth, so a
/// Firestore range would need a stored age field kept in sync by a scheduled
/// job — not worth it at this size, and a stale age is worse than a slightly
/// larger read. That trade-off is the web's, and copying it keeps the two
/// clients showing the same results.
class MatrimonyFilters {
  const MatrimonyFilters({
    this.gender,
    this.minAge,
    this.maxAge,
    this.maritalStatus,
    this.diet,
    this.hometown = '',
    this.search = '',
  });

  final Gender? gender;
  final int? minAge;
  final int? maxAge;
  final MaritalStatus? maritalStatus;
  final Diet? diet;
  final String hometown;
  final String search;

  bool get isEmpty =>
      gender == null &&
      minAge == null &&
      maxAge == null &&
      maritalStatus == null &&
      diet == null &&
      hometown.trim().isEmpty &&
      search.trim().isEmpty;

  /// How many filters are on, for the badge on the filter button.
  int get activeCount => [
    gender != null,
    minAge != null || maxAge != null,
    maritalStatus != null,
    diet != null,
    hometown.trim().isNotEmpty,
  ].where((on) => on).length;

  MatrimonyFilters copyWith({
    Object? gender = _unset,
    Object? minAge = _unset,
    Object? maxAge = _unset,
    Object? maritalStatus = _unset,
    Object? diet = _unset,
    String? hometown,
    String? search,
  }) {
    return MatrimonyFilters(
      gender: gender == _unset ? this.gender : gender as Gender?,
      minAge: minAge == _unset ? this.minAge : minAge as int?,
      maxAge: maxAge == _unset ? this.maxAge : maxAge as int?,
      maritalStatus: maritalStatus == _unset
          ? this.maritalStatus
          : maritalStatus as MaritalStatus?,
      diet: diet == _unset ? this.diet : diet as Diet?,
      hometown: hometown ?? this.hometown,
      search: search ?? this.search,
    );
  }

  /// Sentinel so `copyWith(gender: null)` can mean "clear it" rather than
  /// "leave it alone" — which matters when every filter is nullable.
  static const _unset = Object();
}

/// The draft the profile form edits.
class ProfileDraft {
  const ProfileDraft({
    this.postedBy = PostedBy.self,
    this.name = '',
    this.gender = Gender.female,
    this.dob,
    this.birthTime = '',
    this.birthPlace = '',
    this.heightCm = 0,
    this.maritalStatus = MaritalStatus.neverMarried,
    this.diet = Diet.vegetarian,
    this.education = '',
    this.occupation = '',
    this.workLocation = '',
    this.hometown = '',
    this.seemay = '',
    this.motherTongue = '',
    this.about = '',
    this.fatherOccupation = '',
    this.motherOccupation = '',
    this.siblings = '',
    this.photoVisibility = PhotoVisibility.onAccept,
    this.photos = const [],
    this.phone = '',
    this.email = '',
    this.horoscopeNote = '',
    this.horoscopeImage,
  });

  /// Rebuilds the form from an existing listing plus its contact document.
  factory ProfileDraft.from(
    MatrimonyProfile profile,
    MatrimonyContact? contact,
  ) {
    return ProfileDraft(
      postedBy: profile.postedBy,
      name: profile.name,
      gender: profile.gender,
      dob: profile.dob,
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      heightCm: profile.heightCm,
      maritalStatus: profile.maritalStatus,
      diet: profile.diet,
      education: profile.education,
      occupation: profile.occupation,
      workLocation: profile.workLocation,
      hometown: profile.hometown,
      seemay: profile.seemay,
      motherTongue: profile.motherTongue,
      about: profile.about,
      fatherOccupation: profile.fatherOccupation,
      motherOccupation: profile.motherOccupation,
      siblings: profile.siblings,
      photoVisibility: profile.photoVisibility,
      // Always from the contact document. It holds every photograph, whether
      // or not the public document is allowed to repeat them, so this is the
      // only place the owner's full set can be recovered for editing.
      photos: contact?.photos ?? profile.photos,
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      horoscopeNote: contact?.horoscopeNote ?? '',
      horoscopeImage: contact?.horoscopeImage,
    );
  }

  final PostedBy postedBy;
  final String name;
  final Gender gender;
  final DateTime? dob;
  final String birthTime;
  final String birthPlace;
  final int heightCm;
  final MaritalStatus maritalStatus;
  final Diet diet;
  final String education;
  final String occupation;
  final String workLocation;
  final String hometown;
  final String seemay;
  final String motherTongue;
  final String about;
  final String fatherOccupation;
  final String motherOccupation;
  final String siblings;
  final PhotoVisibility photoVisibility;
  final List<ArticleImage> photos;
  final String phone;
  final String email;
  final String horoscopeNote;
  final ArticleImage? horoscopeImage;

  ProfileDraft copyWith({
    PostedBy? postedBy,
    String? name,
    Gender? gender,
    DateTime? dob,
    String? birthTime,
    String? birthPlace,
    int? heightCm,
    MaritalStatus? maritalStatus,
    Diet? diet,
    String? education,
    String? occupation,
    String? workLocation,
    String? hometown,
    String? seemay,
    String? motherTongue,
    String? about,
    String? fatherOccupation,
    String? motherOccupation,
    String? siblings,
    PhotoVisibility? photoVisibility,
    List<ArticleImage>? photos,
    String? phone,
    String? email,
    String? horoscopeNote,
    // Sentinel, so passing null can mean "removed" rather than "unchanged".
    Object? horoscopeImage = _unsetImage,
  }) {
    return ProfileDraft(
      postedBy: postedBy ?? this.postedBy,
      name: name ?? this.name,
      gender: gender ?? this.gender,
      dob: dob ?? this.dob,
      birthTime: birthTime ?? this.birthTime,
      birthPlace: birthPlace ?? this.birthPlace,
      heightCm: heightCm ?? this.heightCm,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      diet: diet ?? this.diet,
      education: education ?? this.education,
      occupation: occupation ?? this.occupation,
      workLocation: workLocation ?? this.workLocation,
      hometown: hometown ?? this.hometown,
      seemay: seemay ?? this.seemay,
      motherTongue: motherTongue ?? this.motherTongue,
      about: about ?? this.about,
      fatherOccupation: fatherOccupation ?? this.fatherOccupation,
      motherOccupation: motherOccupation ?? this.motherOccupation,
      siblings: siblings ?? this.siblings,
      photoVisibility: photoVisibility ?? this.photoVisibility,
      photos: photos ?? this.photos,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      horoscopeNote: horoscopeNote ?? this.horoscopeNote,
      horoscopeImage: horoscopeImage == _unsetImage
          ? this.horoscopeImage
          : horoscopeImage as ArticleImage?,
    );
  }

  static const _unsetImage = Object();

  /// Age implied by [dob], or null.
  int? get age {
    final birth = dob;
    if (birth == null) return null;
    final now = DateTime.now();
    var years = now.year - birth.year;
    if (now.month < birth.month ||
        (now.month == birth.month && now.day < birth.day)) {
      years -= 1;
    }
    return years;
  }
}

/// Matrimony data access. Mirrors `web-admin/src/lib/api/matrimony.ts`.
class MatrimonyRepository {
  MatrimonyRepository(this._refs);

  final Refs _refs;

  /* ------------------------------ profiles ------------------------------- */

  /// One listing. Live, so a moderator's approval reaches the owner's screen
  /// without them having to know to reload.
  Stream<MatrimonyProfile?> watchProfile(String uid) {
    return _refs.matrimonyProfile(uid).snapshots().map(
      (snapshot) => snapshot.exists ? MatrimonyProfile.fromDoc(snapshot) : null,
    );
  }

  Future<MatrimonyProfile?> profile(String uid) async {
    final snapshot = await _refs.matrimonyProfile(uid).get();
    if (!snapshot.exists) return null;
    return MatrimonyProfile.fromDoc(snapshot);
  }

  /// Contact details.
  ///
  /// Returns null when the rules refuse — which is the normal case, not an
  /// error: it means this viewer has not earned them. The caller shows the
  /// locked state rather than a failure.
  Future<MatrimonyContact?> contact(String uid) async {
    try {
      final snapshot = await _refs.matrimonyContact(uid).get();
      if (!snapshot.exists) return null;
      final base = MatrimonyContact.fromDoc(snapshot);
      // Photographs moved to their own document. Everyone who has earned the
      // contact has also earned them, so they are folded back in here rather
      // than made every screen's problem.
      final photos = await restrictedPhotos(uid);
      return photos.isEmpty ? base : base.withPhotos(photos);
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied') return null;
      rethrow;
    }
  }

  /// The photographs a listing withheld.
  ///
  /// Readable by the owner, a moderator, anyone the owner accepted, and a
  /// subscriber whose plan carried the photo override. Everyone else gets
  /// permission-denied, which is the rules working, so it reads as an empty
  /// list rather than an error.
  Future<List<ArticleImage>> restrictedPhotos(String uid) async {
    try {
      final snapshot = await _refs.matrimonyPhotos(uid).get();
      final data = snapshot.data();
      if (data == null) return const [];
      return data
          .maps('photos')
          .map(ArticleImage.fromMap)
          .toList(growable: false);
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied') return const [];
      rethrow;
    }
  }

  /// Approved listings, newest edit first.
  Future<List<MatrimonyProfile>> search(MatrimonyFilters filters) async {
    Query$ query = _refs.matrimonyProfiles.where(
      'status',
      isEqualTo: MatrimonyStatus.approved.id,
    );

    if (filters.gender != null) {
      query = query.where('gender', isEqualTo: filters.gender!.id);
    }

    final snapshot = await query
        .orderBy('updatedAt', descending: true)
        .limit(200)
        .get();

    var rows = snapshot.docs.map(MatrimonyProfile.fromDoc).toList();

    if (filters.maritalStatus != null) {
      rows = rows
          .where((row) => row.maritalStatus == filters.maritalStatus)
          .toList();
    }
    if (filters.diet != null) {
      rows = rows.where((row) => row.diet == filters.diet).toList();
    }
    if (filters.minAge != null || filters.maxAge != null) {
      rows = rows.where((row) {
        final age = row.age;
        if (age == null) return false;
        if (filters.minAge != null && age < filters.minAge!) return false;
        if (filters.maxAge != null && age > filters.maxAge!) return false;
        return true;
      }).toList();
    }
    final town = filters.hometown.trim().toLowerCase();
    if (town.isNotEmpty) {
      rows = rows
          .where((row) => row.hometown.toLowerCase().contains(town))
          .toList();
    }
    final term = filters.search.trim().toLowerCase();
    if (term.isNotEmpty) {
      rows = rows.where((row) {
        final haystack = [
          row.name,
          row.education,
          row.occupation,
          row.workLocation,
          row.hometown,
        ].join(' ').toLowerCase();
        return haystack.contains(term);
      }).toList();
    }

    return rows;
  }

  /// Writes the listing and its contact document in one batch.
  ///
  /// Saving always returns the profile to `pending`. A member cannot approve
  /// their own listing, and a profile edited after approval has not been
  /// reviewed in the form it is now in. The rules enforce this too — this is
  /// the client agreeing with them rather than discovering it as an error.
  Future<void> saveProfile(String uid, ProfileDraft draft) async {
    // Men are never restricted: the association's rule, and the form does not
    // offer them the choice. Mirrors `photosAreRestricted` on the web, which is
    // the copy the moderation desk writes through.
    final restricted =
        draft.gender != Gender.male &&
        draft.photoVisibility == PhotoVisibility.onAccept;
    final batch = _refs.batch();

    batch.set(_refs.matrimonyProfile(uid), {
      'ownerUid': uid,
      'postedBy': draft.postedBy.id,
      'name': draft.name.trim(),
      'gender': draft.gender.id,
      'dob': draft.dob == null ? null : Timestamp.fromDate(draft.dob!),
      'birthTime': draft.birthTime.trim(),
      'birthPlace': draft.birthPlace.trim(),
      'heightCm': draft.heightCm,
      'maritalStatus': draft.maritalStatus.id,
      'diet': draft.diet.id,
      'education': draft.education.trim(),
      'occupation': draft.occupation.trim(),
      'workLocation': draft.workLocation.trim(),
      'hometown': draft.hometown.trim(),
      'seemay': draft.seemay.trim(),
      'motherTongue': draft.motherTongue.trim(),
      'about': draft.about.trim(),
      'fatherOccupation': draft.fatherOccupation.trim(),
      'motherOccupation': draft.motherOccupation.trim(),
      'siblings': draft.siblings.trim(),
      'photoVisibility': draft.photoVisibility.id,
      // Restricted photographs are withheld from the public document entirely
      // rather than hidden by the UI. Firestore has no field-level security,
      // so a URL written here is readable by every signed-in member — the only
      // way to withhold it is not to write it.
      'photos': restricted
          ? const <Map<String, dynamic>>[]
          : draft.photos.map((photo) => photo.toMap()).toList(),
      // True whenever the owner has photographs at all, restricted or not, so
      // a viewer can be told they exist without being shown them.
      'hasPhotos': draft.photos.isNotEmpty,
      'status': MatrimonyStatus.pending.id,
      // An edit clears any pause it was carrying: the profile a moderator
      // approved is not the profile now on the document, so there is nothing
      // left to resume straight back into.
      'pausedFrom': null,
      'reviewNote': null,
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
      'viewCount': 0,
    }, SetOptions(merge: true));

    batch.set(_refs.matrimonyContact(uid), {
      'phone': draft.phone.trim(),
      'email': draft.email.trim(),
      'horoscopeNote': draft.horoscopeNote.trim(),
      'horoscopeImage': draft.horoscopeImage?.toMap(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    // Emptied when the photographs are public, not just left behind: otherwise
    // a listing that had been restricted would keep a copy readable through the
    // override long after its owner decided to show everybody anyway.
    batch.set(_refs.matrimonyPhotos(uid), {
      'photos': restricted
          ? draft.photos.map((photo) => photo.toMap()).toList()
          : const <Map<String, dynamic>>[],
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    await batch.commit();
  }

  /// Pause a listing, mark the marriage fixed, or put it back in the queue.
  ///
  /// The rules permit only these three from an owner — never `approved`, which
  /// is [resumeOwnListing]'s job and only out of a pause.
  ///
  /// [current] is required when pausing: the rules check that the recorded
  /// origin is the status actually being left, so a pending listing cannot
  /// pause as though it had been approved and resume past the queue.
  Future<void> setOwnStatus(
    String uid,
    MatrimonyStatus status, {
    MatrimonyStatus? current,
  }) async {
    assert(
      status == MatrimonyStatus.paused ||
          status == MatrimonyStatus.married ||
          status == MatrimonyStatus.pending,
      'An owner may only pause, mark married, or resubmit.',
    );
    await _refs.matrimonyProfile(uid).update({
      'status': status.id,
      if (status == MatrimonyStatus.paused) 'pausedFrom': current?.id,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Put a paused listing back, and report where it landed.
  ///
  /// A listing that was approved when it was paused returns to approved rather
  /// than to the back of the queue: nothing about it changed while it was
  /// hidden, so there is nothing for a moderator to read a second time. One
  /// that was still pending resumes as pending, where it already was.
  ///
  /// Exactly three keys move, because the rules allow the return to approved
  /// only when nothing else on the profile moves with it.
  Future<MatrimonyStatus> resumeOwnListing(
    String uid,
    MatrimonyStatus? pausedFrom,
  ) async {
    final status = pausedFrom == MatrimonyStatus.approved
        ? MatrimonyStatus.approved
        : MatrimonyStatus.pending;
    await _refs.matrimonyProfile(uid).update({
      'status': status.id,
      'pausedFrom': null,
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return status;
  }

  Future<void> deleteProfile(String uid) async {
    // The subcollection has to go first: deleting a parent leaves children
    // behind in Firestore, and an orphaned contact document is exactly the
    // thing that must not survive a withdrawal.
    try {
      await _refs.matrimonyContact(uid).delete();
      await _refs.matrimonyPhotos(uid).delete();
    } catch (_) {
      // Nothing there, or already gone.
    }
    await _refs.matrimonyProfile(uid).delete();
  }

  /* ------------------------------ interests ------------------------------ */

  Stream<List<MatrimonyInterest>> watchSent(String uid) {
    return _refs.matrimonyInterests
        .where('fromUid', isEqualTo: uid)
        .snapshots()
        .map((s) => s.docs.map(MatrimonyInterest.fromDoc).toList());
  }

  Stream<List<MatrimonyInterest>> watchReceived(String uid) {
    return _refs.matrimonyInterests
        .where('toUid', isEqualTo: uid)
        .snapshots()
        .map((s) => s.docs.map(MatrimonyInterest.fromDoc).toList());
  }

  Future<void> sendInterest({
    required String fromUid,
    required String toUid,
    required String fromName,
    required String toName,
  }) async {
    if (fromUid == toUid) {
      throw ArgumentError('Cannot send an interest to your own profile.');
    }
    // `set` rather than `add`: the document id is derived from the two uids, so
    // this both creates a first interest and revives one the sender previously
    // withdrew. The rules allow exactly that transition and no other, and the
    // fresh `createdAt` means a revived interest counts against this month's
    // allowance — so withdrawing and resending is not a way around the limit.
    await _refs.matrimonyInterests
        .doc(MatrimonyInterest.idFor(fromUid, toUid))
        .set({
          'fromUid': fromUid,
          'toUid': toUid,
          'fromName': fromName,
          'toName': toName,
          'status': InterestStatus.sent.id,
          'createdAt': FieldValue.serverTimestamp(),
          'respondedAt': null,
        });
  }

  Future<void> respond(String interestId, InterestStatus status) async {
    assert(
      status == InterestStatus.accepted || status == InterestStatus.declined,
      'Only the recipient accepts or declines.',
    );
    await _refs.matrimonyInterests.doc(interestId).update({
      'status': status.id,
      'respondedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> withdraw(String interestId) async {
    await _refs.matrimonyInterests.doc(interestId).update({
      'status': InterestStatus.withdrawn.id,
      'respondedAt': FieldValue.serverTimestamp(),
    });
  }

  /* -------------------------------- other -------------------------------- */

  Future<void> report({
    required String profileId,
    required String profileName,
    required String reporterUid,
    required String reason,
  }) async {
    await _refs.matrimonyReports.add({
      'profileId': profileId,
      'profileName': profileName,
      'reporterUid': reporterUid,
      'reason': reason.trim(),
      'resolved': false,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  /// The account's plan. Read-only by rule — the document is written only by
  /// the server after a verified payment, and every client write is denied.
  Future<Subscription> subscription(String uid) async {
    try {
      final snapshot = await _refs.subscription(uid).get();
      if (!snapshot.exists) return Subscription.none;
      return Subscription.fromDoc(snapshot);
    } on FirebaseException {
      return Subscription.none;
    }
  }

  /// The free allowance the association has configured.
  ///
  /// Falls back to the documented defaults when the document cannot be read,
  /// which today is the ordinary case: `settings/matrimony` is exposed to
  /// editors only under the deployed rules. Failing shut on a number would
  /// close the section over a configuration read.
  Future<MatrimonyLimits> limits() async {
    try {
      final snapshot = await _refs.matrimonySettings.get();
      if (!snapshot.exists) return MatrimonyLimits.defaults;
      return MatrimonyLimits.fromDoc(snapshot);
    } on FirebaseException {
      return MatrimonyLimits.defaults;
    }
  }
}

/// True when the two accounts have an accepted interest in either direction.
///
/// The same test the `matched()` rule performs server-side. Used to decide
/// whether to even attempt the contact read, so the common case does not rely
/// on catching a permission error.
bool isMatched(List<MatrimonyInterest> interests, String a, String b) {
  return interests.any(
    (interest) =>
        interest.status == InterestStatus.accepted &&
        ((interest.fromUid == a && interest.toUid == b) ||
            (interest.fromUid == b && interest.toUid == a)),
  );
}

/// Interests sent since the first of the current month.
int interestsThisMonth(List<MatrimonyInterest> sent) {
  final now = DateTime.now();
  final monthStart = DateTime(now.year, now.month);
  return sent.where((interest) {
    final at = interest.createdAt;
    return at != null && !at.isBefore(monthStart);
  }).length;
}

/// How many interests remain this month; null means unlimited.
int? remainingInterests(
  List<MatrimonyInterest> sent,
  bool premium,
  int allowance,
) {
  if (premium) return null;
  final left = allowance - interestsThisMonth(sent);
  return left < 0 ? 0 : left;
}
