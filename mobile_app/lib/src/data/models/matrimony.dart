import 'package:cloud_firestore/cloud_firestore.dart';

import 'article.dart';
import 'parsing.dart';

/// Matrimony, mirroring the MATRIMONY block of `web-admin/src/lib/types.ts`.
///
/// Two rules shape everything, both taken from the web:
///
/// 1. **A profile's document id is its owner's uid.** One profile per account
///    falls out for free, and the rules answer "is this yours?" without a
///    lookup.
/// 2. **Contact details never live on the profile document.** Firestore has no
///    field-level security, so a phone number on the main document would be
///    readable by anyone who can read the profile at all. Phone, email and
///    restricted photos live in `private/contact`, whose read rule demands an
///    accepted interest.

/// Where a listing is in review. Only `approved` is visible to other members.
enum MatrimonyStatus {
  pending('pending', 'Awaiting review', 'பரிசீலனையில்'),
  approved('approved', 'Live', 'வெளியிடப்பட்டது'),
  rejected('rejected', 'Sent back', 'திருப்பி அனுப்பப்பட்டது'),
  paused('paused', 'Paused', 'இடைநிறுத்தப்பட்டது'),
  married('married', 'Marriage fixed', 'திருமணம் நிச்சயம்');

  const MatrimonyStatus(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static MatrimonyStatus fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => MatrimonyStatus.pending,
  );
}

enum PostedBy {
  self('self', 'Myself', 'நானே'),
  parent('parent', 'Parent', 'பெற்றோர்'),
  sibling('sibling', 'Sibling', 'உடன்பிறந்தவர்'),
  relative('relative', 'Relative', 'உறவினர்');

  const PostedBy(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static PostedBy fromId(String id) =>
      values.firstWhere((value) => value.id == id, orElse: () => PostedBy.self);
}

enum MaritalStatus {
  neverMarried('never_married', 'Never married', 'திருமணமாகாதவர்'),
  divorced('divorced', 'Divorced', 'விவாகரத்து ஆனவர்'),
  widowed('widowed', 'Widowed', 'துணை இழந்தவர்');

  const MaritalStatus(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static MaritalStatus fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => MaritalStatus.neverMarried,
  );
}

enum Diet {
  vegetarian('vegetarian', 'Vegetarian', 'சைவம்'),
  nonVegetarian('non_vegetarian', 'Non-vegetarian', 'அசைவம்'),
  eggetarian('eggetarian', 'Eggetarian', 'முட்டை உண்பவர்');

  const Diet(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static Diet fromId(String id) =>
      values.firstWhere((value) => value.id == id, orElse: () => Diet.vegetarian);
}

enum Gender {
  male('male', 'Male', 'ஆண்'),
  female('female', 'Female', 'பெண்');

  const Gender(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static Gender fromId(String id) =>
      values.firstWhere((value) => value.id == id, orElse: () => Gender.female);

  /// The legal minimum marriage age in India. Enforced when a profile is saved,
  /// on both clients — this is law, not a preference, and a client that lets it
  /// through has published an illegal listing.
  int get minimumAge => this == Gender.male ? 21 : 18;
}

/// Photo visibility has exactly two settings, on purpose.
///
/// An earlier web draft had a "blurred" option and it was dropped rather than
/// shipped: a CSS blur is not privacy, because the image URL is still there.
/// Restricted photos live in the private subcollection and their URLs never
/// reach a client that has not earned them.
enum PhotoVisibility {
  members('members', 'Visible to signed-in members', 'உறுப்பினர்களுக்குத் தெரியும்'),
  onAccept('on_accept', 'Only after an accepted interest', 'ஏற்கப்பட்ட பிறகு மட்டும்');

  const PhotoVisibility(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static PhotoVisibility fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    // The web mapper defaults to the restrictive option, and so does this one:
    // if the field is missing or unreadable, withholding a photograph is the
    // safe failure and showing it is not.
    orElse: () => PhotoVisibility.onAccept,
  );
}

/// A listing, as any signed-in member sees it. Never carries contact details.
class MatrimonyProfile {
  const MatrimonyProfile({
    required this.id,
    required this.ownerUid,
    required this.postedBy,
    required this.name,
    required this.gender,
    required this.dob,
    required this.birthTime,
    required this.birthPlace,
    required this.heightCm,
    required this.maritalStatus,
    required this.diet,
    required this.education,
    required this.occupation,
    required this.workLocation,
    required this.hometown,
    required this.motherTongue,
    required this.about,
    required this.fatherOccupation,
    required this.motherOccupation,
    required this.siblings,
    required this.photoVisibility,
    required this.photos,
    required this.hasPhotos,
    required this.status,
    required this.reviewNote,
    required this.createdAt,
    required this.updatedAt,
    required this.viewCount,
  });

  factory MatrimonyProfile.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    return MatrimonyProfile(
      id: doc.id,
      ownerUid: data.str('ownerUid', doc.id),
      postedBy: PostedBy.fromId(data.str('postedBy')),
      name: data.str('name'),
      gender: Gender.fromId(data.str('gender')),
      dob: data.time('dob'),
      birthTime: data.str('birthTime'),
      birthPlace: data.str('birthPlace'),
      heightCm: data.integer('heightCm'),
      maritalStatus: MaritalStatus.fromId(data.str('maritalStatus')),
      diet: Diet.fromId(data.str('diet')),
      education: data.str('education'),
      occupation: data.str('occupation'),
      workLocation: data.str('workLocation'),
      hometown: data.str('hometown'),
      motherTongue: data.str('motherTongue'),
      about: data.str('about'),
      fatherOccupation: data.str('fatherOccupation'),
      motherOccupation: data.str('motherOccupation'),
      siblings: data.str('siblings'),
      photoVisibility: PhotoVisibility.fromId(data.str('photoVisibility')),
      photos: data
          .maps('photos')
          .map(ArticleImage.fromMap)
          .toList(growable: false),
      hasPhotos: data.flag('hasPhotos'),
      status: MatrimonyStatus.fromId(data.str('status')),
      reviewNote: data.strOrNull('reviewNote'),
      createdAt: data.time('createdAt'),
      updatedAt: data.time('updatedAt'),
      viewCount: data.integer('viewCount'),
    );
  }

  final String id;
  final String ownerUid;
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
  final String motherTongue;
  final String about;
  final String fatherOccupation;
  final String motherOccupation;
  final String siblings;
  final PhotoVisibility photoVisibility;

  /// Populated only when [photoVisibility] is `members`. When photos are
  /// restricted the web writes an empty list here and keeps the real ones in
  /// `private/contact`, so an unearned photo is not merely hidden — it was
  /// never sent.
  final List<ArticleImage> photos;

  /// True when the owner uploaded photographs, whether or not this viewer may
  /// see them. Lets the UI say "photos available on request" honestly.
  final bool hasPhotos;

  final MatrimonyStatus status;
  final String? reviewNote;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int viewCount;

  /// Age in whole years, or null when no date of birth is recorded.
  int? get age {
    final birth = dob;
    if (birth == null) return null;
    final now = DateTime.now();
    var years = now.year - birth.year;
    final beforeBirthday =
        now.month < birth.month ||
        (now.month == birth.month && now.day < birth.day);
    if (beforeBirthday) years -= 1;
    return years;
  }

  /// "5 ft 6 in" — the unit people in the district actually use for height,
  /// even though the field is stored in centimetres.
  String get heightLabel {
    if (heightCm <= 0) return '';
    final totalInches = heightCm / 2.54;
    final feet = totalInches ~/ 12;
    final inches = (totalInches % 12).round();
    // 11.6 inches rounds to 12, which is not a height anybody writes.
    if (inches == 12) return '${feet + 1} ft';
    return '$feet ft $inches in';
  }

  bool get isLive => status == MatrimonyStatus.approved;
}

/// Phone, email and restricted photos. Behind an accepted interest.
class MatrimonyContact {
  const MatrimonyContact({
    required this.phone,
    required this.email,
    required this.photos,
    required this.horoscopeNote,
    required this.horoscopeImage,
  });

  factory MatrimonyContact.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    return MatrimonyContact(
      phone: data.str('phone'),
      email: data.str('email'),
      photos: data
          .maps('photos')
          .map(ArticleImage.fromMap)
          .toList(growable: false),
      horoscopeNote: data.str('horoscopeNote'),
      horoscopeImage: switch (data['horoscopeImage']) {
        final Map<dynamic, dynamic> map => ArticleImage.fromMap(
          map.cast<String, dynamic>(),
        ),
        _ => null,
      },
    );
  }

  final String phone;
  final String email;
  final List<ArticleImage> photos;
  final String horoscopeNote;

  /// A photograph of the jathagam.
  ///
  /// Behind the same accepted-interest gate as the phone number, and for a
  /// stronger reason: a horoscope carries a birth date, a birth time and a
  /// birth place on one sheet.
  final ArticleImage? horoscopeImage;
}

enum InterestStatus {
  sent('sent'),
  accepted('accepted'),
  declined('declined'),
  withdrawn('withdrawn');

  const InterestStatus(this.id);
  final String id;

  static InterestStatus fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => InterestStatus.sent,
  );
}

/// An expression of interest between two accounts.
class MatrimonyInterest {
  const MatrimonyInterest({
    required this.id,
    required this.fromUid,
    required this.toUid,
    required this.fromName,
    required this.toName,
    required this.status,
    required this.createdAt,
    required this.respondedAt,
  });

  factory MatrimonyInterest.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    return MatrimonyInterest(
      id: doc.id,
      fromUid: data.str('fromUid'),
      toUid: data.str('toUid'),
      fromName: data.str('fromName'),
      toName: data.str('toName'),
      status: InterestStatus.fromId(data.str('status')),
      createdAt: data.time('createdAt'),
      respondedAt: data.time('respondedAt'),
    );
  }

  final String id;
  final String fromUid;
  final String toUid;
  final String fromName;
  final String toName;
  final InterestStatus status;
  final DateTime? createdAt;
  final DateTime? respondedAt;

  /// `${fromUid}__${toUid}` — deterministic, which is what lets the security
  /// rule verify the sender without a lookup and stops anyone forging an
  /// interest that appears to come from somebody else.
  static String idFor(String fromUid, String toUid) => '${fromUid}__$toUid';

  /// The other party, from [uid]'s point of view.
  String otherUid(String uid) => fromUid == uid ? toUid : fromUid;

  String otherName(String uid) => fromUid == uid ? toName : fromName;
}

/// What a paid plan does and does not unlock.
///
/// It buys reach, never consent. Contact details stay behind a mutual accept
/// for everyone, paid or free — selling the contact reveal would turn a consent
/// mechanism into a payment mechanism, which is the thing that makes matrimony
/// sites unpleasant. That is the web's reasoning and the app does not soften it.
///
/// Plans themselves live in the `plans` collection and are edited in the admin;
/// nothing about a price is compiled in. The app does not sell them at all (see
/// the README on Play Billing), so it models only what it needs to *display*: a
/// held entitlement, and the free allowance.

/// The free allowance, edited in the admin at `settings/matrimony`.
class MatrimonyLimits {
  const MatrimonyLimits({
    required this.freeProfileViews,
    required this.freeInterestsPerMonth,
  });

  factory MatrimonyLimits.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return MatrimonyLimits(
      freeProfileViews: data.integer(
        'freeProfileViews',
        defaults.freeProfileViews,
      ),
      freeInterestsPerMonth: data.integer(
        'freeInterestsPerMonth',
        defaults.freeInterestsPerMonth,
      ),
    );
  }

  /// `DEFAULT_MATRIMONY_LIMITS` in the web types.
  ///
  /// Used whenever `settings/matrimony` cannot be read — which today is the
  /// normal case, because the deployed rules expose that document to editors
  /// only. Falling back to the documented defaults keeps the section usable
  /// rather than failing shut on a number.
  static const defaults = MatrimonyLimits(
    freeProfileViews: 6,
    freeInterestsPerMonth: 3,
  );

  /// How many listings a free member may see in the browse results.
  final int freeProfileViews;

  /// How many interests a free member may send per calendar month.
  final int freeInterestsPerMonth;
}

/// What this account currently holds.
class Subscription {
  const Subscription({
    required this.planId,
    required this.planName,
    required this.status,
    required this.expiresAt,
  });

  factory Subscription.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Subscription(
      planId: data.strOrNull('planId'),
      planName: data.str('planName'),
      status: data.str('status', 'none'),
      expiresAt: data.time('expiresAt'),
    );
  }

  static const none = Subscription(
    planId: null,
    planName: '',
    status: 'none',
    expiresAt: null,
  );

  /// The `plans` document that was bought, or null on a free account.
  final String? planId;
  final String planName;
  final String status;
  final DateTime? expiresAt;

  /// A subscription that exists but has run out is not a subscription.
  bool get isPremium {
    if (planId == null) return false;
    final expiry = expiresAt;
    if (expiry == null) return false;
    return expiry.isAfter(DateTime.now());
  }
}
