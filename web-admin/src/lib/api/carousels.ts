import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getPublishedArticle } from "@/lib/api/public-news";
import type {
  Article,
  CarouselPlacement,
  CarouselStatus,
  StoryCarousel,
} from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

const COLLECTION = "carousels";

const carouselsCol = () => collection(db, COLLECTION);
const carouselDoc = (id: string) => doc(db, COLLECTION, id);

function toCarousel(id: string, data: Record<string, unknown>): StoryCarousel {
  return {
    id,
    name: (data.name as string) ?? "",
    title: (data.title as string) ?? "",
    titleTa: (data.titleTa as string) ?? "",
    articleIds: (data.articleIds as string[]) ?? [],
    placement: (data.placement as CarouselPlacement) ?? "home_top",
    status: (data.status as CarouselStatus) ?? "draft",
    autoplay: data.autoplay !== false,
    intervalSeconds: (data.intervalSeconds as number) ?? 6,
    createdBy: (data.createdBy as string) ?? "",
    createdAt: (data.createdAt as StoryCarousel["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as StoryCarousel["updatedAt"]) ?? null,
  };
}

export async function listCarousels(): Promise<StoryCarousel[]> {
  const snapshot = await getDocs(query(carouselsCol(), orderBy("createdAt", "desc")));
  return snapshot.docs.map((entry) => toCarousel(entry.id, entry.data()));
}

/** Reader side: the newest running carousel booked into a slot, or nothing. */
export async function getActiveCarousel(
  placement: CarouselPlacement,
): Promise<StoryCarousel | null> {
  const snapshot = await getDocs(
    query(
      carouselsCol(),
      where("status", "==", "active"),
      where("placement", "==", placement),
    ),
  );
  if (snapshot.empty) return null;

  const carousels = snapshot.docs.map((entry) => toCarousel(entry.id, entry.data()));
  carousels.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  return carousels[0];
}

/**
 * Resolves the curated ids to articles, preserving the editor's order.
 *
 * Fetched one document at a time on purpose. A single `documentId() in [...]`
 * query would have to satisfy the security rules for the whole result set,
 * whereas a per-document read is evaluated against that document — so an
 * unpublished or deleted story simply drops out of the carousel instead of
 * failing the entire fetch.
 */
export async function fetchCarouselArticles(ids: string[]): Promise<Article[]> {
  const results = await Promise.all(ids.map((id) => getPublishedArticle(id)));
  return results.filter((article): article is Article => article !== null);
}

export interface CarouselDraft {
  name: string;
  title: string;
  titleTa: string;
  articleIds: string[];
  placement: CarouselPlacement;
  autoplay: boolean;
  intervalSeconds: number;
}

export async function createCarousel(
  draft: CarouselDraft,
  actor: { uid: string },
): Promise<string> {
  const ref = await addDoc(carouselsCol(), {
    ...draft,
    status: "draft" as CarouselStatus,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCarousel(
  id: string,
  draft: CarouselDraft,
): Promise<void> {
  await updateDoc(carouselDoc(id), { ...draft, updatedAt: serverTimestamp() });
}

export async function setCarouselStatus(
  id: string,
  status: CarouselStatus,
): Promise<void> {
  await updateDoc(carouselDoc(id), { status, updatedAt: serverTimestamp() });
}

export async function deleteCarousel(id: string): Promise<void> {
  await deleteDoc(carouselDoc(id));
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/** One page of the carousels list, newest first. */
export function carouselsPage() {
  const constraints = [orderBy("createdAt", "desc")];
  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(COLLECTION, constraints, toCarousel, after, pageSize),
    count: () => countCollection(COLLECTION),
  };
}
