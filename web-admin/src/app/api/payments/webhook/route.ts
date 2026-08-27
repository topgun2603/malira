import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { grantSubscription, recordPayment } from "@/lib/server/entitlements";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the reliable path.
 *
 * The checkout callback runs in the customer's browser, so it is lost whenever
 * the connection drops between the bank and the return trip. This route is
 * called server to server by Razorpay and is what actually guarantees a paid
 * customer ends up with their plan. Both paths converge on grantSubscription,
 * which is idempotent on the payment id.
 *
 * Configure it in the Razorpay dashboard against payment.captured, with the
 * same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // The raw body is required: re-serialising parsed JSON changes the bytes and
  // the signature no longer matches.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          notes?: { uid?: string; planId?: string };
        };
      };
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    // Acknowledged and ignored: anything else must not be retried forever.
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const uid = payment?.notes?.uid;
  const planId = payment?.notes?.planId;

  if (!payment?.id || !payment.order_id || !uid || !planId) {
    return NextResponse.json({ ok: true, ignored: "unmapped-payment" });
  }

  await recordPayment({
    uid,
    orderId: payment.order_id,
    paymentId: payment.id,
    amountInPaise: payment.amount ?? 0,
    planId,
    source: "webhook",
  });

  await grantSubscription({
    uid,
    planId,
    paymentId: payment.id,
    orderId: payment.order_id,
    amountInPaise: payment.amount ?? 0,
  });

  return NextResponse.json({ ok: true });
}
