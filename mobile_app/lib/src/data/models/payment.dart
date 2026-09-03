import 'package:cloud_firestore/cloud_firestore.dart';

import 'article.dart';
import 'parsing.dart';
import 'vendor.dart';

/// Paying, when there is no gateway.
///
/// Mirrors the PAYMENTS block of `web-admin/src/lib/types.ts`. The association
/// is paid straight into its own account, so nothing here can know that money
/// arrived: the app records a claim and a person at the desk reconciles it
/// against the statement. Their approval is the only thing that grants
/// anything, which is why an app that could write its own verdict would be an
/// app that could grant itself a subscription.

enum PaymentStatus {
  submitted('submitted', 'Waiting for the desk', 'சரிபார்ப்பில்'),
  approved('approved', 'Approved', 'ஏற்கப்பட்டது'),
  rejected('rejected', 'Rejected', 'ஏற்கப்படவில்லை');

  const PaymentStatus(this.id, this.label, this.labelTa);

  final String id;
  final String label;
  final String labelTa;

  static PaymentStatus fromId(String id) => values.firstWhere(
    (value) => value.id == id,
    orElse: () => PaymentStatus.submitted,
  );
}

enum PaymentPurpose {
  matrimony('matrimony'),
  vendor('vendor');

  const PaymentPurpose(this.id);

  final String id;
}

/// Where the association would like to be paid. `settings/payments`.
class PaymentSettings {
  const PaymentSettings({
    required this.upiIds,
    required this.payeeName,
    required this.bankName,
    required this.accountName,
    required this.accountNumber,
    required this.ifsc,
    required this.branch,
    required this.qrImage,
    required this.instructions,
    required this.instructionsTa,
    required this.acceptingPayments,
  });

  factory PaymentSettings.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    return PaymentSettings(
      upiIds: data
          .maps('upiIds')
          .map((map) => UpiId(label: '${map['label'] ?? ''}', vpa: '${map['vpa'] ?? ''}'))
          .where((entry) => entry.vpa.trim().isNotEmpty)
          .toList(growable: false),
      payeeName: data.str('payeeName'),
      bankName: data.str('bankName'),
      accountName: data.str('accountName'),
      accountNumber: data.str('accountNumber'),
      ifsc: data.str('ifsc'),
      branch: data.str('branch'),
      qrImage: switch (data['qrImage']) {
        final Map<dynamic, dynamic> map => ArticleImage.fromMap(
          map.cast<String, dynamic>(),
        ),
        _ => null,
      },
      instructions: data.str('instructions'),
      instructionsTa: data.str('instructionsTa'),
      acceptingPayments: data.flag('acceptingPayments'),
    );
  }

  static const empty = PaymentSettings(
    upiIds: [],
    payeeName: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    qrImage: null,
    instructions: '',
    instructionsTa: '',
    acceptingPayments: false,
  );

  final List<UpiId> upiIds;
  final String payeeName;

  final String bankName;
  final String accountName;
  final String accountNumber;
  final String ifsc;
  final String branch;

  final ArticleImage? qrImage;
  final String instructions;
  final String instructionsTa;

  /// Turns off every "pay now" route without deleting the details.
  final bool acceptingPayments;

  bool get canPay => acceptingPayments && upiIds.isNotEmpty;
}

class UpiId {
  const UpiId({required this.label, required this.vpa});

  final String label;
  final String vpa;
}

/// One claim that money was sent.
class PaymentRequest {
  const PaymentRequest({
    required this.id,
    required this.reference,
    required this.purpose,
    required this.planName,
    required this.amountInPaise,
    required this.vendorName,
    required this.utr,
    required this.status,
    required this.reviewNote,
    required this.grantedUntil,
    required this.createdAt,
  });

  factory PaymentRequest.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    return PaymentRequest(
      id: doc.id,
      reference: data.str('reference'),
      purpose: data.str('purpose') == 'vendor'
          ? PaymentPurpose.vendor
          : PaymentPurpose.matrimony,
      planName: data.str('planName'),
      amountInPaise: data.integer('amountInPaise'),
      vendorName: data.str('vendorName'),
      utr: data.str('utr'),
      status: PaymentStatus.fromId(data.str('status')),
      reviewNote: data.strOrNull('reviewNote'),
      grantedUntil: data.time('grantedUntil'),
      createdAt: data.time('createdAt'),
    );
  }

  final String id;
  final String reference;
  final PaymentPurpose purpose;
  final String planName;
  final int amountInPaise;
  final String vendorName;
  final String utr;
  final PaymentStatus status;

  /// Why it was turned down. The whole reason for telling somebody at all.
  final String? reviewNote;
  final DateTime? grantedUntil;
  final DateTime? createdAt;
}

/// What a plan costs, read from the same `plans` collection the web edits.
class VendorPlan {
  const VendorPlan({
    required this.id,
    required this.name,
    required this.priceInPaise,
    required this.months,
  });

  factory VendorPlan.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return VendorPlan(
      id: doc.id,
      name: data.str('name'),
      priceInPaise: data.integer('priceInPaise'),
      months: data.integer('months', 1),
    );
  }

  final String id;
  final String name;
  final int priceInPaise;
  final int months;
}

/// One line in somebody's notices — addressed, unlike a broadcast notification.
class UserNotice {
  const UserNotice({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  factory UserNotice.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return UserNotice(
      id: doc.id,
      kind: data.str('kind'),
      title: data.str('title'),
      body: data.str('body'),
      read: data.flag('read'),
      createdAt: data.time('createdAt'),
    );
  }

  final String id;
  final String kind;
  final String title;
  final String body;
  final bool read;
  final DateTime? createdAt;
}

/// A listing category, carried on a claim so the report can filter by it.
VendorCategory? vendorCategoryOrNull(String? id) =>
    id == null ? null : VendorCategory.fromId(id);
