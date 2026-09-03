import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  DEFAULT_PAYMENT_SETTINGS,
  type ArticleImage,
  type PaymentMethod,
  type PaymentPurpose,
  type PaymentRequest,
  type PaymentSettings,
  type PaymentStatus,
  type VendorCategory,
} from "@/lib/types";

/**
 * Payments, taken by UPI and verified by a person.
 *
 * No gateway, so nothing here can know that money arrived. What it does is
 * record a claim — reference, amount, UTR, screenshot — and hold it until
 * somebody at the desk has matched it against the bank statement. Approval is
 * the only thing that grants an entitlement, and approval is a human act.
 */

const REQUESTS = "paymentRequests";
const UTRS = "paymentUtrs";
const SETTINGS_DOC = () => doc(db, "settings", "payments");

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const snapshot = await getDoc(SETTINGS_DOC());
  if (!snapshot.exists()) {
    return { ...DEFAULT_PAYMENT_SETTINGS, updatedAt: null, updatedBy: null };
  }
  return {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...snapshot.data(),
  } as PaymentSettings;
}

export async function savePaymentSettings(
  input: Omit<PaymentSettings, "updatedAt" | "updatedBy">,
  by: string,
): Promise<void> {
  await setDoc(
    SETTINGS_DOC(),
    { ...input, updatedAt: serverTimestamp(), updatedBy: by },
    { merge: true },
  );
}

/* -------------------------------------------------------------------------- */
/*  The reference                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A short code the payer puts in the UPI note.
 *
 * Deliberately not the document id: this is read off a phone screen and typed
 * into a bank app, so it avoids the characters that get misread there — no O
 * against 0, no I against 1. Six characters over that alphabet is about a
 * billion codes, which is far more than a community association will ever
 * issue, and collisions are caught anyway because the reference is only ever a
 * search key, never an identity.
 */
const REFERENCE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY2346789";

export function newPaymentReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((n) => REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length])
    .join("");
  return `BM-${body}`;
}

/** UPI deep link. The app opens this; the web shows it behind a button. */
export function upiIntentUrl(input: {
  vpa: string;
  payeeName: string;
  amountInPaise: number;
  reference: string;
}): string {
  const params = new URLSearchParams({
    pa: input.vpa,
    pn: input.payeeName,
    am: (input.amountInPaise / 100).toFixed(2),
    cu: "INR",
    tn: input.reference,
  });
  return `upi://pay?${params.toString()}`;
}

/* -------------------------------------------------------------------------- */
/*  Submitting                                                                 */
/* -------------------------------------------------------------------------- */

/** The UTR, normalised, so "abc 123" and "ABC123" cannot both be claimed. */
export function utrKey(utr: string): string {
  return utr.replace(/\s+/g, "").toUpperCase();
}

export interface PaymentSubmission {
  reference: string;
  purpose: PaymentPurpose;
  planId: string;
  planName: string;
  amountInPaise: number;
  months: number;
  vendorId?: string | null;
  vendorName?: string;
  vendorCategory?: VendorCategory | null;
  method: PaymentMethod;
  utr: string;
  proof: ArticleImage | null;
  userName: string;
  userEmail: string;
  userPhone: string;
}

export class DuplicateUtrError extends Error {
  constructor() {
    super("That reference number has already been submitted.");
    this.name = "DuplicateUtrError";
  }
}

/**
 * Records a claim that money was sent.
 *
 * The request and the UTR's uniqueness document are written in one batch, so
 * either both land or neither does. The uniqueness is enforced by the rules
 * refusing a second create on the same key rather than by looking first — two
 * people pasting the same UTR at the same instant would both pass a look.
 */
export async function submitPayment(
  uid: string,
  input: PaymentSubmission,
): Promise<string> {
  const key = utrKey(input.utr);
  const requestRef = doc(collection(db, REQUESTS));

  const batch = writeBatch(db);
  batch.set(requestRef, {
    reference: input.reference,
    uid,
    userName: input.userName,
    userEmail: input.userEmail,
    userPhone: input.userPhone,
    purpose: input.purpose,
    planId: input.planId,
    planName: input.planName,
    amountInPaise: input.amountInPaise,
    months: input.months,
    vendorId: input.vendorId ?? null,
    vendorName: input.vendorName ?? "",
    vendorCategory: input.vendorCategory ?? null,
    method: input.method,
    utr: key,
    proof: input.proof,
    status: "submitted" as PaymentStatus,
    reviewNote: null,
    reviewedBy: null,
    reviewedByName: "",
    reviewedAt: null,
    grantedUntil: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, UTRS, key), {
    uid,
    requestId: requestRef.id,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    // The rules refuse a second create on a taken key, which arrives here as
    // permission-denied. It is the expected answer to a duplicate, not a fault,
    // so it is translated rather than surfaced as "you are not allowed".
    if ((error as { code?: string }).code === "permission-denied") {
      throw new DuplicateUtrError();
    }
    throw error;
  }

  return requestRef.id;
}

/* -------------------------------------------------------------------------- */
/*  Reading                                                                    */
/* -------------------------------------------------------------------------- */

function toRequest(id: string, data: Record<string, unknown>): PaymentRequest {
  return {
    id,
    reference: (data.reference as string) ?? "",
    uid: (data.uid as string) ?? "",
    userName: (data.userName as string) ?? "",
    userEmail: (data.userEmail as string) ?? "",
    userPhone: (data.userPhone as string) ?? "",
    purpose: (data.purpose as PaymentPurpose) ?? "matrimony",
    planId: (data.planId as string) ?? "",
    planName: (data.planName as string) ?? "",
    amountInPaise: (data.amountInPaise as number) ?? 0,
    months: (data.months as number) ?? 1,
    vendorId: (data.vendorId as string) ?? null,
    vendorName: (data.vendorName as string) ?? "",
    vendorCategory: (data.vendorCategory as VendorCategory) ?? null,
    method: (data.method as PaymentMethod) ?? "upi",
    utr: (data.utr as string) ?? "",
    proof: (data.proof as ArticleImage) ?? null,
    status: (data.status as PaymentStatus) ?? "submitted",
    reviewNote: (data.reviewNote as string) ?? null,
    reviewedBy: (data.reviewedBy as string) ?? null,
    reviewedByName: (data.reviewedByName as string) ?? "",
    reviewedAt: (data.reviewedAt as PaymentRequest["reviewedAt"]) ?? null,
    grantedUntil: (data.grantedUntil as PaymentRequest["grantedUntil"]) ?? null,
    createdAt: (data.createdAt as PaymentRequest["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as PaymentRequest["updatedAt"]) ?? null,
  };
}

export interface PaymentReportFilters {
  status?: PaymentStatus | "all";
  purpose?: PaymentPurpose | "all";
  category?: VendorCategory | "all";
  planId?: string | "all";
  /** Inclusive, on the day the claim was submitted. */
  from?: Date | null;
  to?: Date | null;
  search?: string;
}

/**
 * The report.
 *
 * Status is the Firestore filter because it is the one that actually divides
 * the collection; the rest are applied here. That is the same trade the
 * matrimony search makes — every extra `where` on a different field is another
 * composite index to keep, and the association's payment volume is measured in
 * hundreds, not millions.
 */
export async function listPayments(
  filters: PaymentReportFilters = {},
  max = 500,
): Promise<PaymentRequest[]> {
  const base = collection(db, REQUESTS);
  const snapshot = await getDocs(
    filters.status && filters.status !== "all"
      ? query(
          base,
          where("status", "==", filters.status),
          orderBy("createdAt", "desc"),
          limitTo(max),
        )
      : query(base, orderBy("createdAt", "desc"), limitTo(max)),
  );

  let rows = snapshot.docs.map((entry) => toRequest(entry.id, entry.data()));

  if (filters.purpose && filters.purpose !== "all") {
    rows = rows.filter((row) => row.purpose === filters.purpose);
  }
  if (filters.category && filters.category !== "all") {
    rows = rows.filter((row) => row.vendorCategory === filters.category);
  }
  if (filters.planId && filters.planId !== "all") {
    rows = rows.filter((row) => row.planId === filters.planId);
  }
  if (filters.from) {
    const from = filters.from;
    rows = rows.filter((row) => (row.createdAt?.toDate() ?? new Date(0)) >= from);
  }
  if (filters.to) {
    // Inclusive of the whole day somebody picked, not midnight at its start.
    const to = new Date(filters.to);
    to.setHours(23, 59, 59, 999);
    rows = rows.filter((row) => (row.createdAt?.toDate() ?? new Date(0)) <= to);
  }

  const term = filters.search?.trim().toLowerCase() ?? "";
  if (term) {
    rows = rows.filter((row) =>
      [row.reference, row.utr, row.userName, row.userEmail, row.userPhone, row.vendorName]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  return rows;
}

/** Everything one account has ever submitted. */
export async function listOwnPayments(uid: string): Promise<PaymentRequest[]> {
  const snapshot = await getDocs(
    query(collection(db, REQUESTS), where("uid", "==", uid)),
  );
  return snapshot.docs
    .map((entry) => toRequest(entry.id, entry.data()))
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
    );
}

export async function getPayment(id: string): Promise<PaymentRequest | null> {
  const snapshot = await getDoc(doc(db, REQUESTS, id));
  if (!snapshot.exists()) return null;
  return toRequest(snapshot.id, snapshot.data());
}

/** Whether this UTR has been claimed before. A courtesy check, not the guard. */
export async function utrAlreadyUsed(utr: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, UTRS, utrKey(utr)));
  return snapshot.exists();
}

/* -------------------------------------------------------------------------- */
/*  The verdict                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Marks a claim decided.
 *
 * Only the verdict fields move. What was claimed — amount, UTR, screenshot —
 * is what the desk matched against the statement, and rewriting any of it here
 * would destroy the audit trail the manual process exists to produce.
 *
 * Granting the entitlement is a separate call, because it touches a different
 * document and either can fail on its own; the caller sequences them and the
 * report shows a `grantedUntil` that is empty if the grant did not land.
 */
export async function reviewPayment(
  id: string,
  input: {
    status: Extract<PaymentStatus, "approved" | "rejected">;
    note: string;
    by: string;
    byName: string;
    grantedUntil?: Date | null;
  },
): Promise<void> {
  await updateDoc(doc(db, REQUESTS, id), {
    status: input.status,
    reviewNote: input.note.trim() || null,
    reviewedBy: input.by,
    reviewedByName: input.byName,
    reviewedAt: Timestamp.now(),
    grantedUntil: input.grantedUntil
      ? Timestamp.fromDate(input.grantedUntil)
      : null,
    updatedAt: serverTimestamp(),
  });
}
