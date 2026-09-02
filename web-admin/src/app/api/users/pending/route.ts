import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminApp, adminDb, verifyIdToken } from "@/lib/server/firebase-admin";
import { ROLES, type Role } from "@/lib/types";

export const runtime = "nodejs";

/** Roles that may see and admit accounts. Mirrors the "users.manage" grant. */
const MANAGERS = new Set(["super_admin", "admin"]);

/**
 * Accounts that exist in Authentication but not yet in the directory.
 *
 * Users & roles reads the `users` collection, and a document only appears
 * there when `ensureUserProfile` runs on somebody's first successful sign-in.
 * Adding a person in the Firebase Console creates an Authentication record and
 * nothing else, so they were invisible here until they signed in — which reads
 * as "the user I just added is missing" rather than as "waiting".
 *
 * Listing Authentication needs the Admin SDK, which is why this is a route and
 * not a client query.
 */
async function requireManager(request: Request) {
  const app = adminApp();
  const db = adminDb();
  if (!app || !db) {
    return {
      error: NextResponse.json(
        { error: "Not configured on this server. Set FIREBASE_SERVICE_ACCOUNT." },
        { status: 503 },
      ),
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const uid = token ? await verifyIdToken(token) : null;
  if (!uid) {
    return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  }

  const actor = await db.collection("users").doc(uid).get();
  const role = actor.get("role") as string | undefined;
  if (actor.get("disabled") === true || !role || !MANAGERS.has(role)) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to manage users." },
        { status: 403 },
      ),
    };
  }

  return { app, db, uid };
}

export async function GET(request: Request) {
  const ctx = await requireManager(request);
  if ("error" in ctx) return ctx.error;
  const { app, db } = ctx;

  // 1000 is the Admin SDK's page cap. The desk is nowhere near it, and a
  // second page of *pending* accounts would mean something has gone wrong.
  const [accounts, profiles] = await Promise.all([
    getAuth(app).listUsers(1000),
    db.collection("users").select().get(),
  ]);

  const known = new Set(profiles.docs.map((d) => d.id));
  const pending = accounts.users
    .filter((u) => !known.has(u.uid))
    .map((u) => ({
      uid: u.uid,
      email: u.email ?? null,
      phoneNumber: u.phoneNumber ?? null,
      displayName: u.displayName ?? null,
      createdAt: u.metadata.creationTime ?? null,
      lastSignInAt: u.metadata.lastSignInTime ?? null,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json({ pending });
}

/**
 * Admits one pending account into the directory.
 *
 * Writes the profile document the sign-in would have written, with the role
 * chosen here. `ensureUserProfile` returns early when a document already
 * exists, so signing in afterwards only stamps lastLoginAt — the role set here
 * survives.
 */
export async function POST(request: Request) {
  const ctx = await requireManager(request);
  if ("error" in ctx) return ctx.error;
  const { app, db } = ctx;

  const body = (await request.json().catch(() => ({}))) as {
    uid?: string;
    role?: string;
  };
  const uid = typeof body.uid === "string" ? body.uid : null;
  const role = ROLES.includes(body.role as Role) ? (body.role as Role) : "member";
  if (!uid) return NextResponse.json({ error: "Which account?" }, { status: 400 });

  const ref = db.collection("users").doc(uid);
  if ((await ref.get()).exists) {
    return NextResponse.json({ error: "That account is already listed." }, { status: 409 });
  }

  // Read the identity from Authentication rather than trusting the request:
  // the browser supplies a uid and nothing else.
  const account = await getAuth(app).getUser(uid).catch(() => null);
  if (!account) return NextResponse.json({ error: "No such account." }, { status: 404 });

  const email = account.email ?? "";
  const displayName =
    account.displayName || (email ? email.split("@")[0] : account.phoneNumber) || "Member";

  await ref.set({
    email,
    displayName,
    displayNameLower: displayName.trim().toLowerCase(),
    emailLower: email.trim().toLowerCase(),
    photoURL: account.photoURL ?? null,
    role,
    disabled: false,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: null,
  });

  return NextResponse.json({ ok: true, uid, role });
}
