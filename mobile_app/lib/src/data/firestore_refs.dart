import 'package:cloud_firestore/cloud_firestore.dart';

/// Collection names, in one place, matching `lib/firebase/collections.ts` in
/// the admin panel. A rename there is a one-line change here.
abstract final class Collections {
  const Collections._();

  static const articles = 'articles';
  static const categories = 'categories';
  static const events = 'events';
  static const songs = 'songs';
  static const playlists = 'playlists';
  static const polls = 'polls';
  static const ads = 'ads';
  static const carousels = 'carousels';
  static const settings = 'settings';
  static const notifications = 'notifications';

  static const users = 'users';
  static const matrimonyProfiles = 'matrimonyProfiles';
  static const matrimonyInterests = 'matrimonyInterests';
  static const matrimonyReports = 'matrimonyReports';
  static const subscriptions = 'subscriptions';
}

typedef Doc = DocumentSnapshot<Map<String, dynamic>>;
typedef Query$ = Query<Map<String, dynamic>>;

/// Typed handles onto the collections the app is allowed to touch.
///
/// The news half is entirely public-readable under `firestore.rules` and needs
/// no account. The matrimony half is the opposite: nothing in it is public,
/// because these are dates of birth, photographs and family details of people
/// in a small district. A signed-in member is the minimum audience there, and
/// contact details are narrower still.
class Refs {
  Refs(this._db);

  final FirebaseFirestore _db;

  CollectionReference<Map<String, dynamic>> get articles =>
      _db.collection(Collections.articles);
  CollectionReference<Map<String, dynamic>> get categories =>
      _db.collection(Collections.categories);
  CollectionReference<Map<String, dynamic>> get events =>
      _db.collection(Collections.events);
  CollectionReference<Map<String, dynamic>> get songs =>
      _db.collection(Collections.songs);
  CollectionReference<Map<String, dynamic>> get playlists =>
      _db.collection(Collections.playlists);
  CollectionReference<Map<String, dynamic>> get polls =>
      _db.collection(Collections.polls);
  CollectionReference<Map<String, dynamic>> get ads =>
      _db.collection(Collections.ads);
  CollectionReference<Map<String, dynamic>> get carousels =>
      _db.collection(Collections.carousels);

  /// Announcements the desk has pushed. Readable publicly only where
  /// `status == 'sent'`; the queue and its drafts stay with the staff.
  CollectionReference<Map<String, dynamic>> get notifications =>
      _db.collection(Collections.notifications);

  /// `settings/app` is the only settings document the rules expose publicly.
  DocumentReference<Map<String, dynamic>> get appSettings =>
      _db.collection(Collections.settings).doc('app');

  CollectionReference<Map<String, dynamic>> get users =>
      _db.collection(Collections.users);
  CollectionReference<Map<String, dynamic>> get matrimonyProfiles =>
      _db.collection(Collections.matrimonyProfiles);
  CollectionReference<Map<String, dynamic>> get matrimonyInterests =>
      _db.collection(Collections.matrimonyInterests);
  CollectionReference<Map<String, dynamic>> get matrimonyReports =>
      _db.collection(Collections.matrimonyReports);

  DocumentReference<Map<String, dynamic>> user(String uid) => users.doc(uid);

  /// A batch on the same instance these refs came from, so a repository never
  /// has to reach for `FirebaseFirestore.instance` and quietly bypass whatever
  /// this object was constructed with.
  WriteBatch batch() => _db.batch();

  /// A profile's document id IS its owner's uid — one listing per account,
  /// enforced by the rules rather than by a uniqueness check.
  DocumentReference<Map<String, dynamic>> matrimonyProfile(String uid) =>
      matrimonyProfiles.doc(uid);

  /// Phone, email and restricted photos.
  ///
  /// A separate document because Firestore has no field-level security: a phone
  /// number stored on the profile would be readable by everyone who can read
  /// the profile. Its read rule requires an accepted interest in either
  /// direction.
  DocumentReference<Map<String, dynamic>> matrimonyContact(String uid) =>
      matrimonyProfile(uid).collection('private').doc('contact');

  /// Restricted photographs, apart from the contact document.
  ///
  /// They used to sit beside the phone number, which made "show a subscriber
  /// the photographs" and "show a subscriber the phone number" the same
  /// permission. They are not the same question, and there is no field-level
  /// security to separate them, so they are separate documents instead. This
  /// one's read rule also admits a subscriber whose plan carried the override.
  DocumentReference<Map<String, dynamic>> matrimonyPhotos(String uid) =>
      matrimonyProfile(uid).collection('private').doc('photos');

  /// `settings/matrimony` — the free allowance, edited in the admin.
  DocumentReference<Map<String, dynamic>> get matrimonySettings =>
      _db.collection(Collections.settings).doc('matrimony');

  DocumentReference<Map<String, dynamic>> subscription(String uid) =>
      _db.collection(Collections.subscriptions).doc(uid);

  DocumentReference<Map<String, dynamic>> article(String id) =>
      articles.doc(id);
  DocumentReference<Map<String, dynamic>> event(String id) => events.doc(id);
  DocumentReference<Map<String, dynamic>> poll(String id) => polls.doc(id);
}
