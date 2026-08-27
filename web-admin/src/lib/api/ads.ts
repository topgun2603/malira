import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Ad, AdFormat, AdPlacement, AdStatus, ArticleImage } from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

const COLLECTION = "ads";

const adsCol = () => collection(db, COLLECTION);
const adDoc = (id: string) => doc(db, COLLECTION, id);

function toAd(id: string, data: Record<string, unknown>): Ad {
  return {
    id,
    name: (data.name as string) ?? "",
    advertiser: (data.advertiser as string) ?? "",
    format: (data.format as AdFormat) ?? "banner",
    placement: (data.placement as AdPlacement) ?? "home_top",
    headline: (data.headline as string) ?? "",
    headlineTa: (data.headlineTa as string) ?? "",
    body: (data.body as string) ?? "",
    bodyTa: (data.bodyTa as string) ?? "",
    ctaLabel: (data.ctaLabel as string) ?? "",
    ctaUrl: (data.ctaUrl as string) ?? "",
    image: (data.image as ArticleImage | null) ?? null,
    status: (data.status as AdStatus) ?? "draft",
    weight: (data.weight as number) ?? 1,
    startsAt: (data.startsAt as Ad["startsAt"]) ?? null,
    endsAt: (data.endsAt as Ad["endsAt"]) ?? null,
    delaySeconds: (data.delaySeconds as number) ?? 5,
    frequency: (data.frequency as Ad["frequency"]) ?? "once_per_day",
    impressions: (data.impressions as number) ?? 0,
    clicks: (data.clicks as number) ?? 0,
    createdBy: (data.createdBy as string) ?? "",
    createdAt: (data.createdAt as Ad["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Ad["updatedAt"]) ?? null,
  };
}

export async function listAds(): Promise<Ad[]> {
  const snapshot = await getDocs(query(adsCol(), orderBy("createdAt", "desc")));
  return snapshot.docs.map((entry) => toAd(entry.id, entry.data()));
}

export interface AdDraft {
  name: string;
  advertiser: string;
  format: AdFormat;
  placement: AdPlacement;
  headline: string;
  headlineTa: string;
  body: string;
  bodyTa: string;
  ctaLabel: string;
  ctaUrl: string;
  image: ArticleImage | null;
  weight: number;
  startsAt: Date | null;
  endsAt: Date | null;
  delaySeconds: number;
  frequency: Ad["frequency"];
}

function serialise(draft: AdDraft) {
  return {
    ...draft,
    startsAt: draft.startsAt ? Timestamp.fromDate(draft.startsAt) : null,
    endsAt: draft.endsAt ? Timestamp.fromDate(draft.endsAt) : null,
  };
}

export async function createAd(
  draft: AdDraft,
  actor: { uid: string },
): Promise<string> {
  const ref = await addDoc(adsCol(), {
    ...serialise(draft),
    status: "draft" as AdStatus,
    impressions: 0,
    clicks: 0,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAd(id: string, draft: AdDraft): Promise<void> {
  await updateDoc(adDoc(id), { ...serialise(draft), updatedAt: serverTimestamp() });
}

export async function setAdStatus(id: string, status: AdStatus): Promise<void> {
  await updateDoc(adDoc(id), { status, updatedAt: serverTimestamp() });
}

export async function deleteAd(id: string): Promise<void> {
  await deleteDoc(adDoc(id));
}

/* -------------------------------------------------------------------------- */
/*  Serving                                                                    */
/* -------------------------------------------------------------------------- */

/** An ad is servable when it is running and inside its flight dates. */
function isLive(ad: Ad, now: number): boolean {
  if (ad.status !== "active") return false;
  if (ad.startsAt && ad.startsAt.toMillis() > now) return false;
  if (ad.endsAt && ad.endsAt.toMillis() < now) return false;
  return true;
}

/**
 * Weighted pick among the ads competing for one slot.
 *
 * Weight is a share of voice, not a priority: weight 3 against weight 1 wins
 * three times out of four over many page views, rather than always winning.
 * That keeps a small advertiser visible instead of permanently buried.
 */
function pickWeighted(ads: Ad[]): Ad | null {
  if (ads.length === 0) return null;
  const total = ads.reduce((sum, ad) => sum + Math.max(1, ad.weight), 0);
  let roll = Math.random() * total;
  for (const ad of ads) {
    roll -= Math.max(1, ad.weight);
    if (roll <= 0) return ad;
  }
  return ads[ads.length - 1];
}

export async function fetchAdsForPlacement(placement: AdPlacement): Promise<Ad[]> {
  const snapshot = await getDocs(
    query(adsCol(), where("status", "==", "active"), where("placement", "==", placement)),
  );
  const now = Date.now();
  return snapshot.docs
    .map((entry) => toAd(entry.id, entry.data()))
    .filter((ad) => isLive(ad, now));
}

export function chooseAd(ads: Ad[]): Ad | null {
  return pickWeighted(ads);
}

export async function recordImpression(id: string): Promise<void> {
  try {
    await updateDoc(adDoc(id), { impressions: increment(1) });
  } catch {
    // Counting must never break the page for a reader.
  }
}

export async function recordClick(id: string): Promise<void> {
  try {
    await updateDoc(adDoc(id), { clicks: increment(1) });
  } catch {
    // Same: the click-through matters more than the count.
  }
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/** One page of the ad bookings, newest first. */
export function adsPage() {
  const constraints = [orderBy("createdAt", "desc")];
  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(COLLECTION, constraints, toAd, after, pageSize),
    count: () => countCollection(COLLECTION),
  };
}
