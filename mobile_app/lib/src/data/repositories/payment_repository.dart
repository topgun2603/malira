import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../firestore_refs.dart';
import '../models/article.dart';
import '../models/payment.dart';
import '../models/vendor.dart';

/// Raised when a bank reference has already been claimed.
///
/// Not a failure: it is the expected answer to a duplicate, and the difference
/// matters to the person typing. Somebody who submitted twice because the first
/// attempt looked stuck needs to be told that, not "you are not allowed".
class DuplicateUtrException implements Exception {
  const DuplicateUtrException();
}

/// Paying by UPI, and telling the desk about it.
class PaymentRepository {
  PaymentRepository(this._refs);

  final Refs _refs;

  /// Avoids the characters that get misread off a phone screen: no O against 0,
  /// no I against 1. Matches `REFERENCE_ALPHABET` on the web.
  static const _alphabet = 'ACDEFGHJKLMNPQRTUVWXY2346789';

  /// A short code the payer puts in the UPI note.
  ///
  /// It is what lets the desk find a payment again when the UTR is mistyped,
  /// which on a hill signal with a bank app in the way is often.
  static String newReference() {
    final random = Random.secure();
    final body = List.generate(
      6,
      (_) => _alphabet[random.nextInt(_alphabet.length)],
    ).join();
    return 'BM-$body';
  }

  /// The UPI deep link. Android hands this to whichever app claims it.
  static Uri upiIntent({
    required String vpa,
    required String payeeName,
    required int amountInPaise,
    required String reference,
  }) => Uri(
    scheme: 'upi',
    host: 'pay',
    queryParameters: {
      'pa': vpa,
      'pn': payeeName,
      'am': (amountInPaise / 100).toStringAsFixed(2),
      'cu': 'INR',
      'tn': reference,
    },
  );

  /// Normalised, so "abc 123" and "ABC123" cannot both be claimed.
  static String utrKey(String utr) =>
      utr.replaceAll(RegExp(r'\s+'), '').toUpperCase();

  Future<PaymentSettings> settings() async {
    try {
      final snapshot = await _refs.paymentSettings.get();
      if (!snapshot.exists) return PaymentSettings.empty;
      return PaymentSettings.fromDoc(snapshot);
    } on FirebaseException catch (error) {
      // Readable only once signed in. A signed-out reader gets the empty
      // settings, which reads as "payments are closed" rather than as an error.
      if (error.code == 'permission-denied') return PaymentSettings.empty;
      rethrow;
    }
  }

  /// Plans of one kind.
  ///
  /// The kind is filtered here rather than in the query: plans written before
  /// vendors existed carry no `kind` at all, and a Firestore equality would
  /// drop them — the whole matrimony price list would vanish.
  Future<List<VendorPlan>> plans(String kind) async {
    final snapshot = await _refs.plans
        .where('active', isEqualTo: true)
        .get();
    return snapshot.docs
        .where((doc) => (doc.data()['kind'] ?? 'matrimony') == kind)
        .map(VendorPlan.fromDoc)
        .toList(growable: false);
  }

  /// Records a claim that money was sent.
  ///
  /// The claim and the UTR's uniqueness document go in one batch, so either
  /// both land or neither does. Uniqueness is enforced by the rules refusing a
  /// second create on the same key rather than by looking first — two people
  /// pasting the same UTR at the same instant would both pass a look.
  Future<void> submit({
    required String uid,
    required String reference,
    required PaymentPurpose purpose,
    required VendorPlan plan,
    required String utr,
    ArticleImage? proof,
    String vendorId = '',
    String vendorName = '',
    VendorCategory? vendorCategory,
    String userName = '',
    String userEmail = '',
    String userPhone = '',
  }) async {
    final key = utrKey(utr);
    final requestRef = _refs.paymentRequests.doc();
    final batch = _refs.batch();

    batch.set(requestRef, {
      'reference': reference,
      'uid': uid,
      'userName': userName.trim(),
      'userEmail': userEmail.trim(),
      'userPhone': userPhone.trim(),
      'purpose': purpose.id,
      'planId': plan.id,
      'planName': plan.name,
      'amountInPaise': plan.priceInPaise,
      'months': plan.months,
      'vendorId': vendorId.isEmpty ? null : vendorId,
      'vendorName': vendorName,
      'vendorCategory': vendorCategory?.id,
      'method': 'upi',
      'utr': key,
      'proof': proof?.toMap(),
      'status': PaymentStatus.submitted.id,
      'reviewNote': null,
      'reviewedBy': null,
      'reviewedByName': '',
      'reviewedAt': null,
      'grantedUntil': null,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    batch.set(_refs.paymentUtr(key), {
      'uid': uid,
      'requestId': requestRef.id,
      'createdAt': FieldValue.serverTimestamp(),
    });

    try {
      await batch.commit();
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied') {
        throw const DuplicateUtrException();
      }
      rethrow;
    }
  }

  /// Everything this account has claimed, newest first.
  Stream<List<PaymentRequest>> watchOwn(String uid) => _refs.paymentRequests
      .where('uid', isEqualTo: uid)
      .snapshots()
      .map((snapshot) {
        final rows = snapshot.docs.map(PaymentRequest.fromDoc).toList();
        rows.sort((a, b) {
          final left = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final right = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return right.compareTo(left);
        });
        return rows;
      });

  /// What the desk has told this account.
  Stream<List<UserNotice>> watchNotices(String uid) => _refs
      .userNotices(uid)
      .snapshots()
      .map((snapshot) {
        final rows = snapshot.docs.map(UserNotice.fromDoc).toList();
        rows.sort((a, b) {
          final left = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final right = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return right.compareTo(left);
        });
        return rows;
      });

  /// The owner may only ever flip this; the words belong to the desk.
  Future<void> markNoticeRead(String uid, String noticeId) =>
      _refs.userNotices(uid).doc(noticeId).update({'read': true});
}
