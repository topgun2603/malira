import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { MatrimonyLimits, SubscriptionPlan } from "@/lib/types";
import { DEFAULT_MATRIMONY_LIMITS } from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

/**
 * Subscription plans, edited in the admin rather than compiled in.
 *
 * The price shown to a reader comes from here, and so does the price the server
 * charges — the order route reads the same document with the Admin SDK. A
 * browser never gets to say what something costs.
 */

const PLANS = "plans";
const SETTINGS_DOC = () => doc(db, "settings", "matrimony");

function toPlan(id: string, data: Record<string, unknown>): SubscriptionPlan {
  return {
    id,
    // Plans written before vendors existed are matrimony plans. Defaulting
    // rather than migrating keeps the old documents valid.
    kind: (data.kind as SubscriptionPlan["kind"]) ?? "matrimony",
    name: (data.name as string) ?? "",
    nameTa: (data.nameTa as string) ?? "",
    priceInPaise: (data.priceInPaise as number) ?? 0,
    mrpInPaise: (data.mrpInPaise as number) ?? 0,
    months: (data.months as number) ?? 1,
    features: (data.features as string[]) ?? [],
    featuresTa: (data.featuresTa as string[]) ?? [],
    photoOverride: Boolean(data.photoOverride),
    highlight: Boolean(data.highlight),
    active: data.active !== false,
    order: (data.order as number) ?? 1,
    createdAt: (data.createdAt as SubscriptionPlan["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as SubscriptionPlan["updatedAt"]) ?? null,
  };
}

/** Everything, for the admin list. */
export async function listPlans(): Promise<SubscriptionPlan[]> {
  const snapshot = await getDocs(query(collection(db, PLANS), orderBy("order", "asc")));
  return snapshot.docs.map((entry) => toPlan(entry.id, entry.data()));
}

/**
 * What a reader is offered. Public: the landing page prices are marketing.
 *
 * The kind is filtered here rather than in the query on purpose. Plans written
 * before vendors existed carry no `kind` field at all, and a Firestore equality
 * would drop them — the whole matrimony price list would vanish the moment this
 * shipped. `toPlan` defaults them to matrimony; this filters what it returns.
 */
export async function listActivePlans(
  kind: SubscriptionPlan["kind"] = "matrimony",
): Promise<SubscriptionPlan[]> {
  const snapshot = await getDocs(
    query(collection(db, PLANS), where("active", "==", true), orderBy("order", "asc")),
  );
  return snapshot.docs
    .map((entry) => toPlan(entry.id, entry.data()))
    .filter((plan) => plan.kind === kind);
}

export interface PlanDraft {
  kind: SubscriptionPlan["kind"];
  name: string;
  nameTa: string;
  priceInPaise: number;
  mrpInPaise: number;
  months: number;
  features: string[];
  featuresTa: string[];
  photoOverride: boolean;
  highlight: boolean;
  active: boolean;
  order: number;
}

export async function createPlan(draft: PlanDraft): Promise<string> {
  const ref = await addDoc(collection(db, PLANS), {
    ...draft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlan(id: string, draft: Partial<PlanDraft>): Promise<void> {
  await updateDoc(doc(db, PLANS, id), { ...draft, updatedAt: serverTimestamp() });
}

export async function deletePlan(id: string): Promise<void> {
  await deleteDoc(doc(db, PLANS, id));
}

/** One sensible plan so the pricing sections are never empty on a fresh project. */
export async function seedDefaultPlan(): Promise<number> {
  const existing = await listPlans();
  if (existing.length > 0) return 0;
  await createPlan({
    kind: "matrimony",
    name: "Premium",
    nameTa: "பிரீமியம்",
    priceInPaise: 49900,
    mrpInPaise: 99900,
    months: 6,
    features: [
      "Browse every profile",
      "Unlimited interests",
      "See how many people viewed your profile",
    ],
    featuresTa: [
      "அனைத்து விவரங்களையும் பார்க்கலாம்",
      "வரம்பற்ற விருப்பங்கள்",
      "உங்கள் பக்கத்தைப் பார்த்தவர்கள் எண்ணிக்கை",
    ],
    // Off on the seeded plan. Letting a stranger past somebody's photo setting
    // is a decision for the association to take deliberately, not something a
    // fresh project should arrive already doing.
    photoOverride: false,
    highlight: true,
    active: true,
    order: 1,
  });
  return 1;
}

/* -------------------------------------------------------------------------- */
/*  Free tier                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The free allowance is part of the pricing decision, so it is edited in the
 * same place as the paid plans rather than being a constant somebody has to
 * redeploy to change.
 */
export async function getMatrimonyLimits(): Promise<MatrimonyLimits> {
  const snapshot = await getDoc(SETTINGS_DOC());
  if (!snapshot.exists()) return DEFAULT_MATRIMONY_LIMITS;
  return { ...DEFAULT_MATRIMONY_LIMITS, ...snapshot.data() } as MatrimonyLimits;
}

export async function saveMatrimonyLimits(limits: MatrimonyLimits): Promise<void> {
  await setDoc(
    SETTINGS_DOC(),
    { ...limits, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/** One page of the plans list, in display order. */
export function plansPage() {
  const constraints = [orderBy("order", "asc")];
  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(PLANS, constraints, toPlan, after, pageSize),
    count: () => countCollection(PLANS),
  };
}
