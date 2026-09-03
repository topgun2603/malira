import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifyIdToken } from "@/lib/server/firebase-admin";
import { ownsVendor, readPlanPrice } from "@/lib/server/entitlements";

export const runtime = "nodejs";

/**
 * Creates a Razorpay order.
 *
 * The request names a plan; it never names a price. The amount is read from the
 * plan document with the Admin SDK, so editing the price in the admin changes
 * what is actually charged, and a browser that tries to name its own figure is
 * simply ignored.
 */
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Payments are not configured on this server." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const uid = token ? await verifyIdToken(token) : null;

  if (!uid) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    planId?: string;
    vendorId?: string;
  };
  const planId = typeof body.planId === "string" ? body.planId : null;
  const vendorId = typeof body.vendorId === "string" ? body.vendorId : null;
  if (!planId) {
    return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  }

  const plan = await readPlanPrice(planId);
  if (!plan) {
    return NextResponse.json(
      { error: "That plan is no longer available." },
      { status: 404 },
    );
  }

  // A vendor plan buys time on one named listing, so the listing has to be
  // named before the money moves — and it has to belong to whoever is paying.
  // Checked here rather than only at verify: an order that could not possibly
  // be granted should never reach a payment screen.
  if (plan.kind === "vendor") {
    if (!vendorId) {
      return NextResponse.json(
        { error: "Pick which listing this is for." },
        { status: 400 },
      );
    }
    if (!(await ownsVendor(uid, vendorId))) {
      return NextResponse.json(
        { error: "That listing is not yours." },
        { status: 403 },
      );
    }
  } else if (vendorId) {
    return NextResponse.json(
      { error: "That plan is not a listing plan." },
      { status: 400 },
    );
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: plan.amountInPaise,
      currency: "INR",
      // Binds the order to this account and plan before any money moves. The
      // verify route reads these back from Razorpay rather than trusting the
      // browser's word for who paid for what.
      notes: vendorId ? { uid, planId, vendorId } : { uid, planId },
      receipt: vendorId
        ? `ven_${vendorId.slice(0, 10)}_${planId.slice(0, 8)}`
        : `sub_${uid.slice(0, 10)}_${planId.slice(0, 10)}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: plan.amountInPaise,
      currency: "INR",
      keyId,
      planName: plan.name,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not start the payment. Try again." },
      { status: 502 },
    );
  }
}
