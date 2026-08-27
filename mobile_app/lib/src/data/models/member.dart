import 'package:characters/characters.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'parsing.dart';

/// The signed-in account's `users/{uid}` document.
///
/// The same collection the admin panel uses — one account works on both, which
/// is the point: a member who registers in the app can sign in on the web
/// reader with the same credentials and see the same profile.
class Member {
  const Member({
    required this.uid,
    required this.email,
    required this.phone,
    required this.displayName,
    required this.role,
    required this.disabled,
  });

  factory Member.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? const <String, dynamic>{};
    return Member(
      uid: doc.id,
      email: data.str('email'),
      phone: data.str('phone'),
      displayName: data.str('displayName'),
      role: data.str('role', 'member'),
      disabled: data.flag('disabled'),
    );
  }

  final String uid;
  final String email;

  /// E.164, on accounts created by SMS. Empty on email accounts.
  final String phone;

  final String displayName;

  /// One of the roles in `web-admin/src/lib/types.ts`. The app only ever
  /// creates `member`; every other role is granted from the admin panel.
  final String role;

  /// Set by a super admin to block an account. A disabled member keeps their
  /// sign-in but the rules refuse everything, so the app tells them plainly
  /// rather than letting each action fail on its own.
  final bool disabled;

  bool get isModerator =>
      role == 'matrimony_moderator' || role == 'super_admin';

  /// What to show when there is no display name — never a blank byline.
  ///
  /// A phone account has no email, so the number is the last resort. It is not
  /// a good name, but it identifies the account to its owner, which is what a
  /// header has to do.
  String get shortName {
    if (displayName.trim().isNotEmpty) return displayName;
    if (email.contains('@')) return email.split('@').first;
    if (phone.isNotEmpty) return phone;
    return '';
  }

  /// The line under the name in the drawer: whichever identifier they used.
  ///
  /// Null when it would only repeat [shortName], which is the case for a phone
  /// account that has not set a name yet.
  String? get handle {
    if (email.isNotEmpty) return email;
    if (phone.isNotEmpty && phone != shortName) return phone;
    return null;
  }

  /// What other members are allowed to see.
  ///
  /// Deliberately NOT [shortName]. That falls back to the phone number so the
  /// owner can recognise their own account, which is fine on their own screen
  /// and a leak anywhere else: an interest carries the sender's name to the
  /// recipient, and a phone number written there would hand over the one detail
  /// the whole section is built to hold back until both sides accept.
  String get publicName => displayName.trim();

  String get initial =>
      shortName.isEmpty ? '?' : shortName.characters.first.toUpperCase();
}
