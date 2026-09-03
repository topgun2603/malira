import {
  addDoc,
  collection,
  deleteDoc,
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
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type {
  ArticleImage,
  Vendor,
  VendorCategory,
  VendorStatus,
} from "@/lib/types";

/**
 * The wedding services directory.
 *
 * Unlike a matrimony profile, a listing's document id is not its owner's uid:
 * one family often runs the hall and the buses both, and tying the id to the
 * account would force them into two logins to say so. Ownership is a field, and
 * the rules check it.
 */

const VENDORS = "vendors";

const vendorDoc = (id: string) => doc(db, VENDORS, id);

function toVendor(id: string, data: Record<string, unknown>): Vendor {
  return {
    id,
    ownerUid: (data.ownerUid as string) ?? "",
    category: (data.category as VendorCategory) ?? "hall",
    name: (data.name as string) ?? "",
    nameLower: (data.nameLower as string) ?? "",
    about: (data.about as string) ?? "",
    aboutTa: (data.aboutTa as string) ?? "",
    town: (data.town as string) ?? "",
    address: (data.address as string) ?? "",
    mapUrl: (data.mapUrl as string) ?? "",
    phone: (data.phone as string) ?? "",
    whatsapp: (data.whatsapp as string) ?? "",
    email: (data.email as string) ?? "",
    photos: (data.photos as ArticleImage[]) ?? [],
    capacity: (data.capacity as number) ?? 0,
    priceFromInPaise: (data.priceFromInPaise as number) ?? 0,
    details: (data.details as Record<string, string>) ?? {},
    status: (data.status as VendorStatus) ?? "pending",
    reviewNote: (data.reviewNote as string) ?? null,
    reviewedBy: (data.reviewedBy as string) ?? null,
    reviewedAt: (data.reviewedAt as Vendor["reviewedAt"]) ?? null,
    planId: (data.planId as string) ?? null,
    paidUntil: (data.paidUntil as Vendor["paidUntil"]) ?? null,
    featured: data.featured === true,
    createdAt: (data.createdAt as Vendor["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Vendor["updatedAt"]) ?? null,
    viewCount: (data.viewCount as number) ?? 0,
  };
}

export interface VendorDraft {
  category: VendorCategory;
  name: string;
  about: string;
  aboutTa: string;
  town: string;
  address: string;
  mapUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  photos: ArticleImage[];
  capacity: number;
  priceFromInPaise: number;
  details: Record<string, string>;
}

export const EMPTY_VENDOR_DRAFT: VendorDraft = {
  category: "hall",
  name: "",
  about: "",
  aboutTa: "",
  town: "",
  address: "",
  mapUrl: "",
  phone: "",
  whatsapp: "",
  email: "",
  photos: [],
  capacity: 0,
  priceFromInPaise: 0,
  details: {},
};

/* -------------------------------------------------------------------------- */
/*  Reading                                                                    */
/* -------------------------------------------------------------------------- */

export interface VendorFilters {
  category?: VendorCategory;
  town?: string;
  search?: string;
  minCapacity?: number;
}

/**
 * The public directory.
 *
 * Approved is a Firestore filter; paid time is applied here. A range on
 * `paidUntil` alongside the equality on `status` would need a composite index
 * for every ordering, and the directory is small enough that reading the
 * approved page and dropping the lapsed ones costs less than maintaining them.
 *
 * Town, capacity and free text are filtered here too, for the same reason the
 * matrimony search does it: they are the fields families actually combine, and
 * combining them in Firestore means an index per combination.
 */
export async function searchVendors(
  filters: VendorFilters = {},
  max = 200,
): Promise<Vendor[]> {
  const clauses = [where("status", "==", "approved")];
  if (filters.category) clauses.push(where("category", "==", filters.category));

  // Equalities only. Firestore merges single-field indexes for those on its
  // own; adding the two orderBys this used to carry would have demanded a
  // composite index per category and taken the directory down with it.
  const snapshot = await getDocs(
    query(collection(db, VENDORS), ...clauses, limitTo(max)),
  );

  const now = new Date();
  let rows = snapshot.docs
    .map((entry) => toVendor(entry.id, entry.data()))
    .filter((row) => row.paidUntil !== null && row.paidUntil.toDate() > now)
    // Featured first, then most recently touched.
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0);
    });

  const town = filters.town?.trim().toLowerCase() ?? "";
  if (town) {
    rows = rows.filter((row) => row.town.toLowerCase().includes(town));
  }
  if (filters.minCapacity) {
    rows = rows.filter((row) => row.capacity >= filters.minCapacity!);
  }

  const term = filters.search?.trim().toLowerCase() ?? "";
  if (term) {
    rows = rows.filter((row) =>
      [row.name, row.town, row.about, row.address]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  return rows;
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const snapshot = await getDoc(vendorDoc(id));
  if (!snapshot.exists()) return null;
  return toVendor(snapshot.id, snapshot.data());
}

/** Everything one account manages, live or not. */
export async function listOwnVendors(uid: string): Promise<Vendor[]> {
  const snapshot = await getDocs(
    query(collection(db, VENDORS), where("ownerUid", "==", uid)),
  );
  return snapshot.docs.map((entry) => toVendor(entry.id, entry.data()));
}

/** The moderation queue. */
export async function listVendorsByStatus(
  status: VendorStatus | "all",
): Promise<Vendor[]> {
  const base = collection(db, VENDORS);

  // Ordered below rather than in the query, for the same reason the payments
  // report is: an equality plus an ordering on another field needs a composite
  // index, and without it the queue is not slow, it is empty.
  const snapshot = await getDocs(
    status === "all"
      ? query(base, orderBy("updatedAt", "desc"), limitTo(200))
      : query(base, where("status", "==", status), limitTo(200)),
  );
  return snapshot.docs
    .map((entry) => toVendor(entry.id, entry.data()))
    .sort(
      (a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0),
    );
}

/* -------------------------------------------------------------------------- */
/*  Writing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Creates a listing, always in the queue and always unpaid.
 *
 * The rules refuse anything else from a client: a listing that could write its
 * own `paidUntil` could publish itself for nothing.
 */
export async function createVendor(
  uid: string,
  draft: VendorDraft,
): Promise<string> {
  const ref = await addDoc(collection(db, VENDORS), {
    ...draft,
    ownerUid: uid,
    nameLower: draft.name.trim().toLowerCase(),
    status: "pending" as VendorStatus,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    planId: null,
    paidUntil: null,
    featured: false,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * An owner's edit, which returns the listing to the queue.
 *
 * Same rule as a matrimony profile: what a moderator approved is not what is on
 * the document any more. `paidUntil` is untouched, so an edit costs review time
 * but never the time that was paid for.
 */
export async function saveVendor(
  id: string,
  draft: VendorDraft,
): Promise<void> {
  await setDoc(
    vendorDoc(id),
    {
      ...draft,
      nameLower: draft.name.trim().toLowerCase(),
      status: "pending" as VendorStatus,
      reviewNote: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Pause or resume. An owner may not reach for anything else. */
export async function setVendorOwnStatus(
  id: string,
  status: Extract<VendorStatus, "paused" | "pending">,
): Promise<void> {
  await updateDoc(vendorDoc(id), { status, updatedAt: serverTimestamp() });
}

/** The moderator's verdict. */
export async function reviewVendor(
  id: string,
  input: { status: Extract<VendorStatus, "approved" | "rejected">; note?: string; by: string },
): Promise<void> {
  await updateDoc(vendorDoc(id), {
    status: input.status,
    reviewNote: input.note ?? null,
    reviewedBy: input.by,
    reviewedAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
  });
}

/** Paid placement, granted by the desk rather than bought at checkout. */
/**
 * Takes a listing down, or puts it back, without judging it.
 *
 * Distinct from rejecting: a paused listing has done nothing wrong — the hall
 * is booked out for the season, or the desk is waiting on a renewal — and a
 * rejection note would have to say something untrue. Pausing leaves
 * `paidUntil` alone, so the term keeps running and resuming costs the vendor
 * nothing.
 */
export async function setVendorPaused(
  id: string,
  paused: boolean,
  by: string,
): Promise<void> {
  await updateDoc(vendorDoc(id), {
    status: paused ? "paused" : "approved",
    reviewedBy: by,
    reviewedAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Puts time on a listing without a payment passing through the site.
 *
 * Most of this district pays in cash or hands over a UPI reference in person,
 * and the desk still has to be able to say "this one is paid for". Extends
 * from the current expiry when there is time left, so granting early never
 * costs a vendor days they already have — the same arithmetic the payment
 * review does, because a term granted by hand and a term bought online are the
 * same thing to the directory.
 */
export async function grantVendorTerm(
  id: string,
  months: number,
  current: Vendor["paidUntil"],
): Promise<void> {
  const now = new Date();
  const base = current && current.toDate() > now ? current.toDate() : now;
  const until = new Date(base);
  until.setMonth(until.getMonth() + months);

  await updateDoc(vendorDoc(id), {
    paidUntil: Timestamp.fromDate(until),
    updatedAt: serverTimestamp(),
  });
}

export async function setVendorFeatured(
  id: string,
  featured: boolean,
): Promise<void> {
  await updateDoc(vendorDoc(id), { featured, updatedAt: serverTimestamp() });
}

export async function deleteVendor(id: string): Promise<void> {
  await deleteDoc(vendorDoc(id));
}
