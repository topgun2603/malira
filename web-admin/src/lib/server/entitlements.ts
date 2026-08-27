import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

/**
 * Grants a paid plan.
 *
 * Called only after a Razorpay signature has been verified server-side, and
 * only ever from a route handler. Both the checkout callback and the webhook
 * land here, which is why it is idempotent: a payment id that has already been
 * granted is a no-op rather than a second six months.
 *
 * The duration comes from the plan document, read here with the Admin SDK. It
 * is never taken from the request.
 */
export async function grantSubscription(input: {
  uid: string;
  planId: string;
  paymentId: string;
  orderId: string;
  amountInPaise: number;
}): Promise<{ granted: boolean; reason?: string }> {
  const db = adminDb();
  if (!db) return { granted: false, reason: "admin-not-configured" };

  const planSnapshot = await db.collection("plans").doc(input.planId).get();
  if (!planSnapshot.exists) return { granted: false, reason: "unknown-plan" };

  const plan = planSnapshot.data() ?? {};
  const months = Number(plan.months) || 1;
  const planName = String(plan.name ?? "Premium");

  const ref = db.collection("subscriptions").doc(input.uid);
  const existing = await ref.get();

  if (existing.exists && existing.data()?.lastPaymentId === input.paymentId) {
    // Checkout callback and webhook both fire for the same payment.
    return { granted: true, reason: "already-granted" };
  }

  const now = new Date();

  // Extend from the current expiry when the plan is still running, so paying
  // early never costs somebody the days they already hold.
  const currentExpiry = existing.data()?.expiresAt as Timestamp | undefined;
  const base =
    currentExpiry && currentExpiry.toDate() > now ? currentExpiry.toDate() : now;

  const expires = new Date(base);
  expires.setMonth(expires.getMonth() + months);

  await ref.set(
    {
      planId: input.planId,
      planName,
      status: "active",
      startedAt: existing.exists
        ? (existing.data()?.startedAt ?? Timestamp.fromDate(now))
        : Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expires),
      provider: "razorpay",
      lastPaymentId: input.paymentId,
      lastOrderId: input.orderId,
      amountInPaise: input.amountInPaise,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { granted: true };
}

/** Audit trail. Payments are money; they get their own immutable log. */
export async function recordPayment(input: {
  uid: string;
  orderId: string;
  paymentId: string;
  amountInPaise: number;
  planId: string;
  source: "checkout" | "webhook";
}): Promise<void> {
  const db = adminDb();
  if (!db) return;
  await db
    .collection("payments")
    .doc(input.paymentId)
    .set({ ...input, at: FieldValue.serverTimestamp() }, { merge: true });
}

/** The authoritative price. Read from Firestore, never from the browser. */
export async function readPlanPrice(
  planId: string,
): Promise<{ amountInPaise: number; name: string } | null> {
  const db = adminDb();
  if (!db) return null;
  const snapshot = await db.collection("plans").doc(planId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  if (data.active === false) return null;
  const amountInPaise = Number(data.priceInPaise);
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) return null;
  return { amountInPaise, name: String(data.name ?? "Plan") };
}
