import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
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

export function remainingInterests(
  interests: MatrimonyInterest[],
  premium: boolean,
  freeAllowance: number,
): number | "unlimited" {
  if (premium) return "unlimited";
  return Math.max(0, freeAllowance - interestsThisMonth(interests));
}

/* -------------------------------------------------------------------------- */
/*  Checkout                                                                   */
/* -------------------------------------------------------------------------- */

interface RazorpayCheckout {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in first.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * Runs the whole checkout.
 *
 * Resolves only once the server has verified the signature — a Razorpay
 * success handler on its own proves nothing, because it runs in the customer's
 * browser where anything can be faked.
 */
export async function startPlanCheckout(
  planId: string,
  profileName: string,
): Promise<void> {
  const ready = await loadCheckout();
  if (!ready) throw new Error("Could not reach the payment provider.");

  const headers = await authHeader();

  const orderResponse = await fetch("/api/payments/order", {
    method: "POST",
    headers,
    body: JSON.stringify({ planId }),
  });

  if (!orderResponse.ok) {
    const { error } = (await orderResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(error ?? "Could not start the payment.");
  }

  const order = (await orderResponse.json()) as {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planName: string;
  };

  await new Promise<void>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "RK Matrimony",
      description: `Matrimony — ${order.planName}`,
      prefill: { name: profileName },
      // Matrimony rose: checkout only ever opens inside that section.
      theme: { color: "#9c3464" },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers,
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          if (!verify.ok) {
            const { error } = (await verify.json().catch(() => ({}))) as {
              error?: string;
            };
            reject(new Error(error ?? "Payment could not be verified."));
            return;
          }
          resolve();
        } catch {
          reject(new Error("Payment could not be verified."));
        }
      },
    });

    checkout.open();
  });
}
