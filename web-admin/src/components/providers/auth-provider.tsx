"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { friendlyError } from "@/lib/firebase/errors";
import { ensureUserProfile } from "@/lib/api/users";
import type { AdminUser } from "@/lib/types";

interface AuthState {
  firebaseUser: User | null;
  profile: AdminUser | null;
  loading: boolean;
  configured: boolean;
  /** Set when sign-in worked but the profile could not be read or written. */
  profileError: string | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** Open self-registration. New accounts land as Member — no desk access. */
  registerWithPassword: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Where to land afterwards. The desk goes to /login; a reader goes home. */
  signOut: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Nothing to wait for when Firebase has not been wired up yet.
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      try {
        setProfileError(null);
        const record = await ensureUserProfile({
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL,
        });

        // A disabled account must not linger in a half-signed-in state.
        if (record.disabled) {
          await fbSignOut(auth);
          setProfile(null);
          setFirebaseUser(null);
        } else {
          setProfile(record);
        }
      } catch (cause) {
        // Almost always an undeployed or over-strict Firestore rule set.
        // Failing loudly beats a spinner that never resolves.
        setProfile(null);
        setProfileError(friendlyError(cause));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    [],
  );

  const registerWithPassword = useCallback(
    async (name: string, email: string, password: string) => {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(
    async (redirectTo = "/login") => {
      await fbSignOut(auth);
      setProfile(null);
      router.replace(redirectTo);
    },
    [router],
  );

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      profile,
      loading,
      profileError,
      configured: isFirebaseConfigured,
      signInWithPassword,
      registerWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [
      firebaseUser,
      profile,
      loading,
      profileError,
      signInWithPassword,
      registerWithPassword,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
