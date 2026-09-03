import 'package:cloud_firestore/cloud_firestore.dart';

import '../firestore_refs.dart';
import '../models/article.dart';
import '../models/vendor.dart';

/// The wedding services directory.
///
/// Reads are public — the rules release an approved listing to anyone, signed
/// in or not — so nothing here checks for an account before searching.
class VendorRepository {
  VendorRepository(this._refs);

  final Refs _refs;

  /// Live listings, newest first, with the featured ones ahead of the rest.
  ///
  /// Approval is a Firestore filter; paid time is applied here. A range on
  /// `paidUntil` beside the equality on `status` would need a composite index
  /// for every ordering, and the directory is small enough that reading the
  /// approved page and dropping the lapsed ones costs less than maintaining
  /// them. Town, capacity and free text are filtered here for the same reason
  /// the matrimony search does it: combining them in Firestore means an index
  /// per combination.
  Future<List<Vendor>> search({
    VendorCategory? category,
    String town = '',
    String term = '',
    int? minCapacity,
  }) async {
    Query<Map<String, dynamic>> query = _refs.vendors.where(
      'status',
      isEqualTo: VendorStatus.approved.id,
    );
    if (category != null) {
      query = query.where('category', isEqualTo: category.id);
    }

    final snapshot = await query.limit(200).get();
    final now = DateTime.now();

    var rows = snapshot.docs
        .map(Vendor.fromDoc)
        .where((row) => row.paidUntil?.isAfter(now) ?? false)
        .toList();

    final place = town.trim().toLowerCase();
    if (place.isNotEmpty) {
      rows = rows
          .where((row) => row.town.toLowerCase().contains(place))
          .toList();
    }
    if (minCapacity != null) {
      rows = rows.where((row) => row.capacity >= minCapacity).toList();
    }

    final needle = term.trim().toLowerCase();
    if (needle.isNotEmpty) {
      rows = rows.where((row) {
        final haystack = [
          row.name,
          row.town,
          row.about,
          row.address,
        ].join(' ').toLowerCase();
        return haystack.contains(needle);
      }).toList();
    }

    // Featured first, then the most recently touched. Sorted here rather than
    // ordered in the query, because ordering on two fields beside the equality
    // is exactly the composite index this avoids.
    rows.sort((a, b) {
      if (a.featured != b.featured) return a.featured ? -1 : 1;
      final left = a.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final right = b.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return right.compareTo(left);
    });

    return rows;
  }

  Stream<Vendor?> watch(String id) => _refs
      .vendor(id)
      .snapshots()
      .map((doc) => doc.exists ? Vendor.fromDoc(doc) : null);

  /// Everything this account manages, live or not.
  Stream<List<Vendor>> watchOwn(String uid) => _refs.vendors
      .where('ownerUid', isEqualTo: uid)
      .snapshots()
      .map((snapshot) => snapshot.docs.map(Vendor.fromDoc).toList());

  /// Creates a listing, always in the queue and always unpaid.
  ///
  /// The rules refuse anything else from a client: a listing that could write
  /// its own `paidUntil` could publish itself for nothing.
  Future<String> create(String uid, VendorDraft draft) async {
    final ref = await _refs.vendors.add({
      ...draft.toMap(),
      'ownerUid': uid,
      'nameLower': draft.name.trim().toLowerCase(),
      'status': VendorStatus.pending.id,
      'reviewNote': null,
      'reviewedBy': null,
      'reviewedAt': null,
      'planId': null,
      'paidUntil': null,
      'featured': false,
      'viewCount': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  /// An owner's edit, which returns the listing to the queue.
  ///
  /// `paidUntil` is untouched, so an edit costs review time but never the time
  /// that was paid for.
  Future<void> save(String id, VendorDraft draft) async {
    await _refs.vendor(id).set({
      ...draft.toMap(),
      'nameLower': draft.name.trim().toLowerCase(),
      'status': VendorStatus.pending.id,
      'reviewNote': null,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  /// Pause or resume. The rules permit an owner nothing else.
  Future<void> setOwnStatus(String id, VendorStatus status) async {
    assert(
      status == VendorStatus.paused || status == VendorStatus.pending,
      'An owner may only pause or resubmit.',
    );
    await _refs.vendor(id).update({
      'status': status.id,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> delete(String id) => _refs.vendor(id).delete();
}

/// What a business types in.
class VendorDraft {
  const VendorDraft({
    this.category = VendorCategory.hall,
    this.name = '',
    this.about = '',
    this.aboutTa = '',
    this.town = '',
    this.address = '',
    this.mapUrl = '',
    this.phone = '',
    this.whatsapp = '',
    this.email = '',
    this.photos = const <ArticleImage>[],
    this.capacity = 0,
    this.priceFromInPaise = 0,
    this.details = const {},
  });

  factory VendorDraft.from(Vendor vendor) => VendorDraft(
    category: vendor.category,
    name: vendor.name,
    about: vendor.about,
    aboutTa: vendor.aboutTa,
    town: vendor.town,
    address: vendor.address,
    mapUrl: vendor.mapUrl,
    phone: vendor.phone,
    whatsapp: vendor.whatsapp,
    email: vendor.email,
    photos: vendor.photos,
    capacity: vendor.capacity,
    priceFromInPaise: vendor.priceFromInPaise,
    details: vendor.details,
  );

  final VendorCategory category;
  final String name;
  final String about;
  final String aboutTa;
  final String town;
  final String address;
  final String mapUrl;
  final String phone;
  final String whatsapp;
  final String email;
  final List<ArticleImage> photos;
  final int capacity;
  final int priceFromInPaise;
  final Map<String, String> details;

  VendorDraft copyWith({
    VendorCategory? category,
    String? name,
    String? about,
    String? aboutTa,
    String? town,
    String? address,
    String? mapUrl,
    String? phone,
    String? whatsapp,
    String? email,
    List<ArticleImage>? photos,
    int? capacity,
    int? priceFromInPaise,
    Map<String, String>? details,
  }) => VendorDraft(
    category: category ?? this.category,
    name: name ?? this.name,
    about: about ?? this.about,
    aboutTa: aboutTa ?? this.aboutTa,
    town: town ?? this.town,
    address: address ?? this.address,
    mapUrl: mapUrl ?? this.mapUrl,
    phone: phone ?? this.phone,
    whatsapp: whatsapp ?? this.whatsapp,
    email: email ?? this.email,
    photos: photos ?? this.photos,
    capacity: capacity ?? this.capacity,
    priceFromInPaise: priceFromInPaise ?? this.priceFromInPaise,
    details: details ?? this.details,
  );

  Map<String, dynamic> toMap() => {
    'category': category.id,
    'name': name.trim(),
    'about': about.trim(),
    'aboutTa': aboutTa.trim(),
    'town': town.trim(),
    'address': address.trim(),
    'mapUrl': mapUrl.trim(),
    'phone': phone.trim(),
    'whatsapp': whatsapp.trim(),
    'email': email.trim(),
    'photos': photos.map((photo) => photo.toMap()).toList(growable: false),
    'capacity': capacity,
    'priceFromInPaise': priceFromInPaise,
    'details': details,
  };
}
