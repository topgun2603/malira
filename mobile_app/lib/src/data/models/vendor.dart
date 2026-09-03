import 'package:cloud_firestore/cloud_firestore.dart';

import 'article.dart';
import 'parsing.dart';

/// The wedding services directory, mirroring the VENDORS block of
/// `web-admin/src/lib/types.ts`.
///
/// Two rules shape it, both taken from the web:
///
/// 1. **A listing is owned by a field, not by its document id.** One family
///    often runs the hall and the buses, and keying the document on the account
///    would force them into two logins to say so.
/// 2. **Two independent gates decide whether it is in the directory** — a
///    moderator's approval and paid time that has not run out. Either lapses
///    without the other, so both are stored and both are checked.

enum VendorCategory {
  hall('hall', 'Marriage halls', 'திருமண மண்டபம்'),
  catering('catering', 'Catering', 'சமையல்'),
  photography('photography', 'Photography', 'புகைப்படம்'),
  decoration('decoration', 'Decoration', 'அலங்காரம்'),
  transport('transport', 'Transport', 'வாகனம்'),
  music('music', 'Music', 'இசை');

  const VendorCategory(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static VendorCategory fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => VendorCategory.hall,
  );
}

enum VendorStatus {
  pending('pending', 'Awaiting review', 'பரிசீலனையில்'),
  approved('approved', 'Live', 'வெளியிடப்பட்டது'),
  rejected('rejected', 'Sent back', 'திருப்பி அனுப்பப்பட்டது'),
  paused('paused', 'Paused', 'இடைநிறுத்தப்பட்டது');

  const VendorStatus(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static VendorStatus fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    // The restrictive answer when the field is missing or unreadable: an
    // unrecognised listing waits for a person rather than publishing itself.
    orElse: () => VendorStatus.pending,
  );
}

class Vendor {
  const Vendor({
    required this.id,
    required this.ownerUid,
    required this.category,
    required this.name,
    required this.about,
    required this.aboutTa,
    required this.town,
    required this.address,
    required this.mapUrl,
    required this.phone,
    required this.whatsapp,
    required this.email,
    required this.photos,
    required this.capacity,
    required this.priceFromInPaise,
    required this.details,
    required this.status,
    required this.reviewNote,
    required this.planId,
    required this.paidUntil,
    required this.featured,
    required this.updatedAt,
  });

  factory Vendor.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Vendor(
      id: doc.id,
      ownerUid: data.str('ownerUid'),
      category: VendorCategory.fromId(data.str('category')),
      name: data.str('name'),
      about: data.str('about'),
      aboutTa: data.str('aboutTa'),
      town: data.str('town'),
      address: data.str('address'),
      mapUrl: data.str('mapUrl'),
      phone: data.str('phone'),
      whatsapp: data.str('whatsapp'),
      email: data.str('email'),
      photos: data
          .maps('photos')
          .map(ArticleImage.fromMap)
          .toList(growable: false),
      capacity: data.integer('capacity'),
      priceFromInPaise: data.integer('priceFromInPaise'),
      details: switch (data['details']) {
        final Map<dynamic, dynamic> map => map.map(
          (key, value) => MapEntry('$key', '$value'),
        ),
        _ => const <String, String>{},
      },
      status: VendorStatus.fromId(data.str('status')),
      reviewNote: data.strOrNull('reviewNote'),
      planId: data.strOrNull('planId'),
      paidUntil: data.time('paidUntil'),
      featured: data.flag('featured'),
      updatedAt: data.time('updatedAt'),
    );
  }

  final String id;
  final String ownerUid;
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

  /// Seats, for a hall. Zero everywhere else.
  final int capacity;
  final int priceFromInPaise;

  /// Whatever else the category needs — vehicle types, plates served, hours.
  final Map<String, String> details;

  final VendorStatus status;
  final String? reviewNote;

  final String? planId;

  /// Paid up to here, or null on a listing nobody has paid for.
  final DateTime? paidUntil;
  final bool featured;
  final DateTime? updatedAt;

  /// Approved AND paid. Both, because either lapses without the other.
  bool get isLive {
    if (status != VendorStatus.approved) return false;
    final until = paidUntil;
    if (until == null) return false;
    return until.isAfter(DateTime.now());
  }
}
