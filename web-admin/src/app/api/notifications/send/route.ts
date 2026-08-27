import { NextResponse } from "next/server";
import { getMessaging } from "firebase-admin/messaging";
import { FieldValue } from "firebase-admin/firestore";
import { adminApp, adminDb, verifyIdToken } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

/** Roles allowed to push to every phone in the district. */
const SENDERS = new Set(["super_admin", "admin", "editor"]);

/**
 * Sends a queued notification to its FCM topic.
 *
 * Composing happens in the browser and writing the queued document is policed
 * by the security rules; sending cannot be, because it needs the service
 * account and that must never reach a bundle. So the browser names an id and
 * nothing else — the title, body, audience and deep link are all read back from
 * Firestore here. A caller who edits the request payload changes nothing about
 * what goes out.
 *
 * Topics rather than device tokens: the app is open to readers with no account,
 * so there is no uid to file a token against. The app subscribes to `all`,
 * `news`, `events` and `songs` on first launch, and those names match
 * NOTIFICATION_AUDIENCES exactly.
 */
export async function POST(request: Request) {
  const app = adminApp();
  const db = adminDb();

  if (!app || !db) {
    return NextResponse.json(
      {
        error:
          "Sending is not configured on this server. Set FIREBASE_SERVICE_ACCOUNT.",
      },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const uid = token ? await verifyIdToken(token) : null;
  if (!uid) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // The role is read server-side. A signed-in member can call this route; only
  // an editor gets past this line.
  const actor = await db.collection("users").doc(uid).get();
  const role = actor.get("role") as string | undefined;
  const active = actor.get("active") !== false;
  if (!active || !role || !SENDERS.has(role)) {
    return NextResponse.json(
      { error: "You do not have permission to send notifications." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as { id?: string };
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id) return NextResponse.json({ error: "Which message?" }, { status: 400 });

  const ref = db.collection("notifications").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "No such message." }, { status: 404 });
  }

  // Only a queued message sends. Without this a second click — or a retry after
  // a timeout — pushes the same announcement to every phone twice.
  if (snapshot.get("status") !== "queued") {
    return NextResponse.json(
      { error: "That message has already been sent." },
      { status: 409 },
    );
  }

  const title = (snapshot.get("title") as string) ?? "";
  const body = (snapshot.get("body") as string) ?? "";
  const titleTa = (snapshot.get("titleTa") as string) ?? "";
  const bodyTa = (snapshot.get("bodyTa") as string) ?? "";
  const audience = (snapshot.get("audience") as string) ?? "all";
  const targetType = (snapshot.get("targetType") as string) ?? "none";
  const targetId = (snapshot.get("targetId") as string | null) ?? null;

  try {
    await getMessaging(app).send({
      topic: audience,
      // The visible half. FCM draws this itself when the app is in the
      // background, which is why it has to be the English text: the server has
      // no way to know which language a given phone is set to.
      notification: { title, body },
      // The Tamil pair travels alongside so the in-app list and the foreground
      // notification can show the reader's own language.
      data: {
        titleTa,
        bodyTa,
        targetType,
        ...(targetId ? { targetId } : {}),
        notificationId: id,
      },
      android: {
        priority: "high",
        notification: { channelId: "nilgiri_news_general" },
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Delivery failed.";
    // Recorded on the document, not just returned: the send history is the only
    // place anyone will look afterwards to find out what happened.
    await ref.update({ status: "failed", failureReason: reason });
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  await ref.update({
    status: "sent",
    sentAt: FieldValue.serverTimestamp(),
    failureReason: null,
  });

  // FCM reports no per-device count for a topic send — it accepts the message
  // and fans it out asynchronously — so there is deliberately no delivered
  // figure to write here. Leaving the field at zero is honest; inventing one
  // would not be.
  return NextResponse.json({ ok: true, topic: audience });
}
