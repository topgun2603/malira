import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

/**
 * A person at the desk decides whether money actually arrived.
 *
 * There is no gateway to ask, so this is the whole verification step: somebody
 * has matched a UTR against the bank statement and is now recording that. It
 * runs on the server for two reasons — the entitlement it grants is written to
 * documents the rules refuse to every client, and approving a payment is the
 * one action in this product where a client that could forge the request would
 * be forging money.
 *
 * Granting and recording happen in one Firestore transaction. A verdict stored
 * without the entitlement it promised is the failure the payer notices; a
 * transaction is what stops a half-applied approval existing at all.
 */

type Verdict = "approved" | "rejected";

export async function POST(request: Request) {
  const db = adminDb();
  if (!db) {
    return NextResponse.json(
      { error: "The server is not configured to verify payments." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  const uid = token ? await verifyIdToken(token) : null;
  if (!uid) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // The role is read here rather than trusted from the caller. Verifying a
  // payment grants paid time, so it sits with the account that answers for the
  // association's bank.
  const reviewer = await db.collection("users").doc(uid).get();
  const reviewerData = reviewer.data() ?? {};
  if (!reviewer.exists || reviewerData.role !== "super_admin" || reviewerData.disabled) {
    return NextResponse.json(
      { error: "Only a Super Admin may verify payments." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    verdict?: Verdict;
    note?: string;
  };

  const requestId = typeof body.requestId === "string" ? body.requestId : null;
  const verdict = body.verdict === "approved" || body.verdict === "rejected"
    ? body.verdict
    : null;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!requestId || !verdict) {
    return NextResponse.json({ error: "Nothing to decide." }, { status: 400 });
  }
  // A rejection without a reason is the thing the payer cannot act on, and the
  // reason is what gets sent to them.
  if (verdict === "rejected" && !note) {
    return NextResponse.json(
      { error: "Say why it was rejected. The payer is told." },
      { status: 400 },
    );
  }

  const requestRef = db.collection("paymentRequests").doc(requestId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(requestRef);
      if (!snapshot.exists) return { error: "That payment no longer exists." };

      const payment = snapshot.data() ?? {};
      if (payment.status !== "submitted") {
        // Two people at the desk opening the same claim is ordinary; granting
        // twice is not. The first verdict stands.
        return { error: `That payment was already ${payment.status}.` };
      }

      let grantedUntil: Date | null = null;

      if (verdict === "approved") {
        const months = Number(payment.months) || 1;
        const now = new Date();

        if (payment.purpose === "vendor") {
          const vendorId = String(payment.vendorId ?? "");
          if (!vendorId) return { error: "That claim names no listing." };

          const vendorRef = db.collection("vendors").doc(vendorId);
          const vendorSnap = await tx.get(vendorRef);
          if (!vendorSnap.exists) return { error: "That listing no longer exists." };

          const vendor = vendorSnap.data() ?? {};
          // Extended from whatever is left, so paying early never costs days
          // already bought.
          const current = vendor.paidUntil as Timestamp | undefined;
          const base = current && current.toDate() > now ? current.toDate() : now;
          const until = new Date(base);
          until.setMonth(until.getMonth() + months);
          grantedUntil = until;

          tx.set(
            vendorRef,
            {
              planId: payment.planId ?? null,
              paidUntil: Timestamp.fromDate(until),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        } else {
          const subRef = db.collection("subscriptions").doc(String(payment.uid));
          const subSnap = await tx.get(subRef);
          const current = subSnap.data()?.expiresAt as Timestamp | undefined;
          const base = current && current.toDate() > now ? current.toDate() : now;
          const until = new Date(base);
          until.setMonth(until.getMonth() + months);
          grantedUntil = until;

          const planSnap = await tx.get(
            db.collection("plans").doc(String(payment.planId ?? "")),
          );
          const plan = planSnap.data() ?? {};

          tx.set(
            subRef,
            {
              planId: payment.planId ?? null,
              planName: payment.planName ?? "",
              status: "active",
              photoOverride: plan.photoOverride === true,
              startedAt: subSnap.exists
                ? (subSnap.data()?.startedAt ?? Timestamp.fromDate(now))
                : Timestamp.fromDate(now),
              expiresAt: Timestamp.fromDate(until),
              provider: null,
              lastPaymentId: requestId,
              amountInPaise: Number(payment.amountInPaise) || 0,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }
      }

      tx.update(requestRef, {
        status: verdict,
        reviewNote: note || null,
        reviewedBy: uid,
        reviewedByName: String(reviewerData.displayName ?? ""),
        reviewedAt: Timestamp.now(),
        grantedUntil: grantedUntil ? Timestamp.fromDate(grantedUntil) : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Addressed to the payer, and carrying the reason. A rejection nobody is
      // told about is indistinguishable from the desk having lost the payment.
      const noticeRef = db
        .collection("userNotices")
        .doc(String(payment.uid))
        .collection("items")
        .doc();

      const amount = ((Number(payment.amountInPaise) || 0) / 100).toFixed(0);
      const what = payment.purpose === "vendor"
        ? String(payment.vendorName || "your listing")
        : String(payment.planName || "your subscription");

      tx.set(noticeRef, {
        kind: verdict === "approved" ? "payment_approved" : "payment_rejected",
        title: verdict === "approved" ? "Payment approved" : "Payment not accepted",
        titleTa: verdict === "approved"
          ? "கட்டணம் ஏற்கப்பட்டது"
          : "கட்டணம் ஏற்கப்படவில்லை",
        body: verdict === "approved"
          ? `₹${amount} received for ${what}. It is active until ${grantedUntil?.toLocaleDateString("en-IN") ?? ""}.`
          : `₹${amount} for ${what} was not accepted. ${note}`,
        bodyTa: "",
        refId: requestId,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { ok: true, grantedUntil: grantedUntil?.toISOString() ?? null };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Could not record that decision. Nothing was changed." },
      { status: 500 },
    );
  }
}
