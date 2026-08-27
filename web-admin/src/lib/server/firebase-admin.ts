import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Admin SDK, server-only.
 *
 * This exists for exactly one reason: a subscription entitlement must be
 * written by something the browser cannot impersonate. Every other write in
 * this project goes through the client SDK and is policed by security rules;
 * an entitlement cannot be, because the rules have no way to know whether a
 * payment actually cleared.
 *
 * The service account JSON is read from FIREBASE_SERVICE_ACCOUNT (base64 or
 * raw JSON). It is a secret and must never be prefixed NEXT_PUBLIC_.
 */

function readServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
}

let cached: App | null = null;

export function adminApp(): App | null {
  if (cached) return cached;
  if (getApps().length > 0) {
    cached = getApps()[0];
    return cached;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) return null;

  cached = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      // Newlines survive .env round-trips as literal backslash-n.
      privateKey: serviceAccount.private_key?.replace(/\\n/g, "\n"),
    }),
  });
  return cached;
}

export function adminDb() {
  const app = adminApp();
  return app ? getFirestore(app) : null;
}

/** Verifies a Firebase ID token sent by the browser. Returns the uid. */
export async function verifyIdToken(token: string): Promise<string | null> {
  const app = adminApp();
  if (!app) return null;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export const isAdminConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
