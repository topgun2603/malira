import crypto from "node:crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifyIdToken } from "@/lib/server/firebase-admin";
import {
  grantSubscription,
  grantVendorListing,
  recordPayment,
} from "@/lib/server/entitlements";

export const runtime = "nodejs";

/**
 * Verifies the Razorpay checkout callback and grants the plan.
 *
 * Two independent checks, because either alone leaves a hole:
 *
 *   1. The signature — HMAC-SHA256 of `order_id|payment_id` keyed with the
 *      Razorpay secret. Only the server holds that secret, so a forged success
 *      callback cannot pass. Compared with timingSafeEqual rather than `===`,
 *      since string comparison leaks how many leading characters matched.
 *
 *   2. The order itself, fetched back from Razorpay. The signature proves the
 *      payment belongs to the order; it says nothing about whether the order
 *      belongs to *this* account. The uid, plan and amount all come from the
 *      order's notes, so the browser cannot claim somebody else's payment or a
 *      cheaper plan than the one it paid for.
 */
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const uid = token ? await verifyIdToken(token) : null;
  if (!uid) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  };

  const { orderId, paymentId, signature } = body;
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Incomplete payment." }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: "That payment could not be verified." },
      { status: 400 },
    );
  }

  let orderUid: string | undefined;
  let orderPlanId: string | undefined;
  let orderVendorId: string | null = null;
  let amountInPaise = 0;

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.fetch(orderId);
    const notes = (order.notes ?? {}) as {
      uid?: string;
      planId?: string;
      vendorId?: string;
    };
    orderVendorId = notes.vendorId ?? null;
    orderUid = notes.uid;
    orderPlanId = notes.planId;
    amountInPaise = Number(order.amount) || 0;
  } catch {
    return NextResponse.json(
      { error: "Could not confirm the payment with Razorpay." },
      { status: 502 },
    );
  }

  if (orderUid !== uid || !orderPlanId) {
    return NextResponse.json(
      { error: "That payment does not belong to this account." },
      { status: 403 },
    );
  }

  await recordPayment({
    uid,
    orderId,
    paymentId,
    amountInPaise,
    planId: orderPlanId,
    source: "checkout",
  });

  // Which of the two things was bought is decided by the order Razorpay holds,
  // not by the browser: the note was written when the order was created and is
  // read back from Razorpay here.
  const result = orderVendorId
    ? await grantVendorListing({
        uid,
        vendorId: orderVendorId,
        planId: orderPlanId,
        paymentId,
      })
    : await grantSubscription({
        uid,
        planId: orderPlanId,
        paymentId,
        orderId,
        amountInPaise,
      });

  if (!result.granted) {
    // The money moved but the entitlement did not. Say so plainly rather than
    // showing success; the webhook is the safety net.
    return NextResponse.json(
      { error: "Payment received, but the plan could not be activated yet." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
