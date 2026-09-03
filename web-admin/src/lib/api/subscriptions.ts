import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Subscription } from "@/lib/types";
import type { MatrimonyInterest } from "@/lib/types";

/**
 * Subscriptions are read-only from the browser.
 *
 * The document is written exclusively by the server after a verified Razorpay
 * payment, and the security rules deny every client write. Nothing here can
 * grant anybody anything.
 */
export async function getSubscription(uid: string): Promise<Subscription | null> {
  const snapshot = await getDoc(doc(db, "subscriptions", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    planId: (data.planId as string) ?? null,
    planName: (data.planName as string) ?? "",
    status: (data.status as Subscription["status"]) ?? "none",
    photoOverride: data.photoOverride === true,
    startedAt: (data.startedAt as Subscription["startedAt"]) ?? null,
    expiresAt: (data.expiresAt as Subscription["expiresAt"]) ?? null,
    provider: (data.provider as Subscription["provider"]) ?? null,
    lastPaymentId: (data.lastPaymentId as string) ?? null,
    lastOrderId: (data.lastOrderId as string) ?? null,
    amountInPaise: (data.amountInPaise as number) ?? 0,
    updatedAt: (data.updatedAt as Subscription["updatedAt"]) ?? null,
  };
}

/** A subscription that exists but has run out is not a subscription. */
export function isPremium(subscription: Subscription | null | undefined): boolean {
  if (!subscription) return false;
  if (!subscription.planId) return false;
  if (!subscription.expiresAt) return false;
  // A subscription that has run out is not a subscription.
  return subscription.expiresAt.toDate() > new Date();
}

/** Interests sent since the first of the current month. */
export function interestsThisMonth(interests: MatrimonyInterest[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return interests.filter((interest) => {
    const at = interest.createdAt?.toDate();
    return at ? at >= monthStart : false;
  }).length;
}

/**
 * How many interests this account may still send.
 *
 * Zero without a subscription, rather than a monthly allowance: sending an
 * interest is the act the plan is sold for.
 *
 * `settings/matrimony` still carries a free allowance and the desk can still
 * set it; nothing reads it while matrimony is subscribers-only. Turning the
 * free tier back on is this function plus the `visible` line in browse, not an
 * excavation — which is why the setting was left alone rather than deleted.
 */
export function remainingInterests(
  interests: MatrimonyInterest[],
  premium: boolean,
): number | "unlimited" {
  if (premium) return "unlimited";
  return 0;
}

/* -------------------------------------------------------------------------- */
/*  Checkout                                                                   */
/* -------------------------------------------------------------------------- */

/*
 * There is no gateway any more.
 *
 * The Razorpay checkout that used to live here loaded a third-party script,
 * opened a hosted modal and resolved once the server had verified a signature.
 * It has been removed rather than left dormant: it was the one place in the
 * product that pulled executable code from another origin into a page where
 * somebody was about to type money, and code that nothing calls is code nobody
 * checks.
 *
 * Money is now taken by UPI straight into the association's account and
 * verified by a person against the statement — see `lib/api/payments.ts` and
 * `app/api/payments/review`. The server routes under `app/api/payments/order`
 * and `/verify` are kept for the day a gateway is wanted again; they do nothing
 * without Razorpay credentials in the environment.
 */
