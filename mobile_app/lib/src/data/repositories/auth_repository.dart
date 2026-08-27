import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../firestore_refs.dart';
import '../models/member.dart';

/// A sign-in failure, already worded for a reader.
///
/// Firebase codes are precise and useless to the person holding the phone.
/// Everything the UI shows comes from here so the wording is decided once.
class AuthFailure implements Exception {
  const AuthFailure(this.message);
  final String message;

  @override
  String toString() => message;
}

/// A verification in flight: the handle Firebase gives back when it sends an
/// SMS, plus the token that lets a resend reuse the same session.
class PhoneVerification {
  const PhoneVerification({required this.verificationId, this.resendToken});

  final String verificationId;

  /// Passing this on a resend stops Firebase treating it as a fresh request,
  /// which is what keeps a second SMS from tripping the abuse limits.
  final int? resendToken;
}

/// Accounts.
///
/// Two ways in, and the phone is the one that matters here: this readership is
/// rural, older, and largely does not keep an email address. A number they
/// already know is the difference between an account they can create alone and
/// one they need a grandchild for.
///
/// Email and password stays because it is what the admin panel uses, so one
/// account works on both, and because it needs no Android registration — which
/// is why it shipped first.
///
/// Everything talks to this class rather than to FirebaseAuth, so the two
/// methods are interchangeable from the rest of the app's point of view.
class AuthRepository {
  AuthRepository(this._auth, this._refs);

  final FirebaseAuth _auth;
  final Refs _refs;

  /// Fires on sign-in, sign-out and token refresh.
  Stream<User?> authStateChanges() => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _touchProfile(credential.user);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_message(error));
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      final user = credential.user;
      if (user == null) throw const AuthFailure('Could not create the account.');

      await user.updateDisplayName(name.trim());
      await _createProfile(user, name.trim());
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_message(error));
    }
  }

  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_message(error));
    }
  }

  /* ------------------------------- phone --------------------------------- */

  /// Normalises what somebody types into E.164.
  ///
  /// Readers write their number every way there is: with spaces, with a
  /// leading 0, with +91 already on it. All of those are the same number, and
  /// rejecting them for formatting would be the app being difficult about
  /// something it can work out for itself.
  static String? normaliseIndianNumber(String input) {
    final digits = input.replaceAll(RegExp(r'[^0-9]'), '');

    // 10 digits, the plain form. Indian mobiles start 6-9; a landline or a
    // typo starting 0-5 is not going to receive an SMS.
    if (digits.length == 10 && RegExp(r'^[6-9]').hasMatch(digits)) {
      return '+91$digits';
    }
    // 0XXXXXXXXXX — the trunk prefix people still write out of habit.
    if (digits.length == 11 && digits.startsWith('0')) {
      return normaliseIndianNumber(digits.substring(1));
    }
    // 91XXXXXXXXXX, with or without the +.
    if (digits.length == 12 && digits.startsWith('91')) {
      return normaliseIndianNumber(digits.substring(2));
    }
    return null;
  }

  /// Asks Firebase to send an SMS.
  ///
  /// [onAutoVerified] fires when Android reads the message itself and signs the
  /// reader in without them typing anything — common on this platform, and the
  /// screen has to be ready for the flow to simply finish under it.
  Future<void> sendSmsCode({
    required String phoneNumber,
    required void Function(PhoneVerification) onCodeSent,
    required void Function(AuthFailure) onFailed,
    required void Function() onAutoVerified,
    int? resendToken,
  }) async {
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      forceResendingToken: resendToken,
      timeout: const Duration(seconds: 60),
      verificationCompleted: (credential) async {
        try {
          final result = await _auth.signInWithCredential(credential);
          await _touchProfile(result.user, phoneNumber: phoneNumber);
          onAutoVerified();
        } on FirebaseAuthException catch (error) {
          onFailed(AuthFailure(_message(error)));
        }
      },
      verificationFailed: (error) => onFailed(AuthFailure(_message(error))),
      codeSent: (verificationId, resendToken) => onCodeSent(
        PhoneVerification(
          verificationId: verificationId,
          resendToken: resendToken,
        ),
      ),
      // Auto-retrieval gave up. The code is still valid and still typable, so
      // there is nothing to tell the reader here.
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  /// Completes a phone sign-in with the six digits the reader typed.
  Future<void> confirmSmsCode({
    required PhoneVerification verification,
    required String smsCode,
    required String phoneNumber,
  }) async {
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verification.verificationId,
        smsCode: smsCode.trim(),
      );
      final result = await _auth.signInWithCredential(credential);
      await _touchProfile(result.user, phoneNumber: phoneNumber);
    } on FirebaseAuthException catch (error) {
      throw AuthFailure(_message(error));
    }
  }

  /// Sets the name other members see.
  ///
  /// Written to `users/{uid}` as well as to the Firebase profile, because the
  /// app reads the Firestore document, not the auth record.
  Future<void> setDisplayName(String name) async {
    final user = _auth.currentUser;
    if (user == null) return;

    final trimmed = name.trim();
    await user.updateDisplayName(trimmed);
    await _refs.user(user.uid).update({'displayName': trimmed});
  }

  Future<void> signOut() => _auth.signOut();

  /// The signed-in account's member document, live.
  Stream<Member?> watchMember(String uid) {
    return _refs.user(uid).snapshots().map(
      (snapshot) => snapshot.exists ? Member.fromDoc(snapshot) : null,
    );
  }

  /// Creates `users/{uid}` for a new account.
  ///
  /// Always `member`. The admin panel has a bootstrap path that lets the very
  /// first account ever created claim super_admin; the app deliberately does
  /// not implement it. Somebody registering from a phone to use matrimony must
  /// never be able to take the desk's top seat, even by accident on an empty
  /// project.
  Future<void> _createProfile(User user, String name, {String? phone}) async {
    final number = phone ?? user.phoneNumber ?? '';

    await _refs.user(user.uid).set({
      'email': user.email ?? '',
      'phone': number,
      // A phone account has no email to fall back on, so the number becomes
      // the name until they set one. A blank byline in an interest is worse
      // than a number.
      'displayName': name.isNotEmpty
          ? name
          : ((user.email ?? '').contains('@')
                ? user.email!.split('@').first
                : number),
      'photoURL': null,
      'role': 'member',
      'disabled': false,
      'createdAt': FieldValue.serverTimestamp(),
      'lastLoginAt': FieldValue.serverTimestamp(),
    });
  }

  /// Records the sign-in, and heals an account whose document went missing.
  ///
  /// A user can exist in Firebase Auth with no `users/` document — created
  /// before the collection existed, or a half-finished registration. Without
  /// this they would sign in successfully and then be refused by every rule,
  /// which is the least debuggable state the app can be in.
  Future<void> _touchProfile(User? user, {String? phoneNumber}) async {
    if (user == null) return;
    final reference = _refs.user(user.uid);
    final snapshot = await reference.get();

    if (!snapshot.exists) {
      await _createProfile(user, user.displayName ?? '', phone: phoneNumber);
      return;
    }
    await reference.update({'lastLoginAt': FieldValue.serverTimestamp()});
  }

  /// Firebase error codes, in words a reader can act on.
  static String _message(FirebaseAuthException error) {
    return switch (error.code) {
      // Modern Firebase collapses wrong-password and no-such-user into one
      // code on purpose, so an attacker cannot use the error to discover which
      // email addresses are registered. The wording has to cover both.
      'invalid-credential' ||
      'wrong-password' ||
      'user-not-found' => 'That email address and password do not match.',
      'invalid-email' => 'That does not look like an email address.',
      'email-already-in-use' =>
        'There is already an account with that email address. Sign in instead.',
      'weak-password' => 'Use a password of at least six characters.',
      'user-disabled' =>
        'This account has been blocked. Contact the association.',
      'too-many-requests' =>
        'Too many attempts. Wait a few minutes and try again.',
      'network-request-failed' =>
        'No connection. Check your network and try again.',
      'operation-not-allowed' =>
        'That sign-in method is not enabled for this app yet.',
      'invalid-phone-number' => 'Check the mobile number and try again.',
      'invalid-verification-code' =>
        'That code is not right. Check the message and try again.',
      'session-expired' || 'code-expired' =>
        'That code has expired. Ask for a new one.',
      'quota-exceeded' =>
        'Too many messages have been sent today. Try again tomorrow.',
      // The Android app is not registered in Firebase with this signing
      // certificate, so Firebase will not trust an SMS request from it.
      'app-not-authorized' || 'missing-client-identifier' =>
        'This build is not set up for SMS sign-in yet. Use email instead.',
      _ => 'Could not sign in. Please try again.',
    };
  }
}
