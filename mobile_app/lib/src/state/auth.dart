import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/member.dart';
import '../data/repositories/auth_repository.dart';
import 'providers.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>(
  (ref) => FirebaseAuth.instance,
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(firebaseAuthProvider),
    ref.watch(refsProvider),
  ),
);

/// The Firebase account, or null. The single source of truth for "signed in".
final authStateProvider = StreamProvider<User?>(
  (ref) => ref.watch(authRepositoryProvider).authStateChanges(),
);

/// The current uid, or null. Most things want this rather than the whole user.
final currentUidProvider = Provider<String?>(
  (ref) => ref.watch(authStateProvider).value?.uid,
);

final isSignedInProvider = Provider<bool>(
  (ref) => ref.watch(currentUidProvider) != null,
);

/// The signed-in account's `users/{uid}` document, live.
///
/// Live rather than fetched once because a super admin can disable an account
/// or change its role from the panel, and the app should reflect that on the
/// next frame rather than at the next cold start.
final memberProvider = StreamProvider<Member?>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(null);
  return ref.watch(authRepositoryProvider).watchMember(uid);
});

/// True only when there is an account AND it has not been blocked.
///
/// Everything gated on membership asks this rather than [isSignedInProvider],
/// so a disabled account is told once and clearly instead of hitting a wall of
/// permission errors one action at a time.
final isActiveMemberProvider = Provider<bool>((ref) {
  final member = ref.watch(memberProvider).value;
  return member != null && !member.disabled;
});
