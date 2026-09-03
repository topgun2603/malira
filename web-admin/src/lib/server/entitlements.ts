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
  const photoOverride = plan.photoOverride === true;

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
      // Denormalised on purpose: the rules read this field, and a rule that had
      // to follow planId would cost an extra document read on every photograph.
      photoOverride,
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
): Promise<{ amountInPaise: number; name: string; kind: string } | null> {
  const db = adminDb();
  if (!db) return null;
  const snapshot = await db.collection("plans").doc(planId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  if (data.active === false) return null;
  const amountInPaise = Number(data.priceInPaise);
  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) return null;
  return {
    amountInPaise,
    name: String(data.name ?? "Plan"),
    kind: String(data.kind ?? "matrimony"),
  };
}

/**
 * Puts paid time on a directory listing.
 *
 * The vendor equivalent of [grantSubscription], and separate from it because
 * the thing being extended is different: a member's entitlement hangs off the
 * account, a listing's hangs off the listing, and one account may hold several
 * listings that expire on different days.
 *
 * Approval is not granted here. A moderator's yes and a vendor's payment are
 * different facts, and paying has never been a way past review.
 */
/** Whether this account manages that listing. Checked before an order is made. */
export async function ownsVendor(uid: string, vendorId: string): Promise<boolean> {
  const db = adminDb();
  if (!db) return false;
  const snapshot = await db.collection("vendors").doc(vendorId).get();
  return snapshot.exists && snapshot.data()?.ownerUid === uid;
}

export async function grantVendorListing(input: {
  uid: string;
  vendorId: string;
  planId: string;
  paymentId: string;
}): Promise<{ granted: boolean; reason?: string }> {
  const db = adminDb();
  if (!db) return { granted: false, reason: "admin-not-configured" };

  const [planSnapshot, vendorSnapshot] = await Promise.all([
    db.collection("plans").doc(input.planId).get(),
    db.collection("vendors").doc(input.vendorId).get(),
  ]);

  if (!planSnapshot.exists) return { granted: false, reason: "unknown-plan" };
  if (!vendorSnapshot.exists) return { granted: false, reason: "unknown-vendor" };

  const vendor = vendorSnapshot.data() ?? {};
  // The order carries the buyer; this is where it is checked against the thing
  // being bought, so nobody can pay to extend somebody else's listing.
  if (vendor.ownerUid !== input.uid) {
    return { granted: false, reason: "not-the-owner" };
  }
  if (vendor.lastPaymentId === input.paymentId) {
    // Checkout callback and webhook both fire for the same payment.
    return { granted: true, reason: "already-granted" };
  }

  const plan = planSnapshot.data() ?? {};
  const months = Number(plan.months) || 1;

  const now = new Date();
  // Extended from the current expiry when there is time left, so renewing early
  // never costs a vendor the days they have already paid for.
  const current = vendor.paidUntil as Timestamp | undefined;
  const base = current && current.toDate() > now ? current.toDate() : now;
  const paidUntil = new Date(base);
  paidUntil.setMonth(paidUntil.getMonth() + months);

  await vendorSnapshot.ref.set(
    {
      planId: input.planId,
      paidUntil: Timestamp.fromDate(paidUntil),
      lastPaymentId: input.paymentId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { granted: true };
}
