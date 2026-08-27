import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
);

/**
 * The SDK throws at construction on a malformed key, which would break the
 * production build before the env vars are ever wired up. Falling back to inert
 * placeholders keeps module evaluation safe; every call site is gated on
 * isFirebaseConfigured, and the UI shows the setup notice instead.
 */
const firebaseConfig: FirebaseOptions = isFirebaseConfigured
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : {
      apiKey: "not-configured",
      authDomain: "not-configured.firebaseapp.com",
      projectId: "not-configured",
      storageBucket: "not-configured.appspot.com",
      messagingSenderId: "0",
      appId: "1:0:web:0",
    };

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
