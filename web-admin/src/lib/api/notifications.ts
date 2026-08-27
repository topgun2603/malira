import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type {
  NotificationAudience,
  NotificationMessage,
  NotificationStatus,
} from "@/lib/types";

const COLLECTION = "notifications";

/**
 * This app composes and queues a push. It does not send one.
 *
 * Sending to an FCM topic requires a server credential, which must never reach
 * a browser bundle. Writing the message here with status "queued" is the whole
 * of the client's job; a Cloud Function triggered on create reads the document,
 * calls FCM, and writes back "sent" with the delivery counts. Until that
 * Function is deployed, messages accumulate here as a queue rather than
 * silently pretending to have gone out.
 */
export async function listNotifications(
  max = 50,
): Promise<NotificationMessage[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("createdAt", "desc"), fbLimit(max)),
  );
  return snapshot.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as NotificationMessage,
  );
}

export interface NotificationDraft {
  title: string;
  titleTa: string;
  body: string;
  bodyTa: string;
  audience: NotificationAudience;
  targetType: NotificationMessage["targetType"];
  targetId: string | null;
}

export async function queueNotification(
  draft: NotificationDraft,
  actor: { uid: string; name: string },
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...draft,
    status: "queued" as NotificationStatus,
    sentAt: null,
    deliveredCount: 0,
    openedCount: 0,
    failureReason: null,
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Asks the server to push a queued message to its topic.
 *
 * The request carries an id and nothing else. Everything that goes out is read
 * back from Firestore by the route, so a tampered payload changes nothing about
 * the message — and the send needs the service account, which cannot live in a
 * browser bundle.
 */
export async function sendNotification(id: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in first.");

  const response = await fetch("/api/notifications/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "The notification could not be sent.");
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
