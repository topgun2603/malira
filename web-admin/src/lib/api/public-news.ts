import {
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { articleDoc, articlesCol } from "@/lib/firebase/collections";
import type { Article } from "@/lib/types";

/**
 * The reader-facing queries.
 *
 * Deliberately separate from `api/articles.ts`, which is the editorial view.
 * These never look at anything but `status == "published"`, which keeps the
 * "could an unpublished story leak into the feed" question answerable by
 * reading one short file. The mobile app will mirror exactly these queries.
 */

function toArticle(id: string, data: Record<string, unknown>): Article {
  return {
    id,
    title: (data.title as string) ?? "",
    titleTa: (data.titleTa as string) ?? "",
    slug: (data.slug as string) ?? "",
    summary: (data.summary as string) ?? "",
    summaryTa: (data.summaryTa as string) ?? "",
    body: (data.body as string) ?? "",
    bodyTa: (data.bodyTa as string) ?? "",
    categoryId: (data.categoryId as string) ?? "",
    tags: (data.tags as string[]) ?? [],
    images: (data.images as Article["images"]) ?? [],
    youtubeUrl: (data.youtubeUrl as string) ?? null,
    sourceName: (data.sourceName as string) ?? "",
    authorName: (data.authorName as string) ?? "",
    status: "published",
    pinned: Boolean(data.pinned),
    commentsEnabled: Boolean(data.commentsEnabled),
    publishAt: null,
    publishedAt: (data.publishedAt as Article["publishedAt"]) ?? null,
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "",
    updatedBy: null,
    createdAt: (data.createdAt as Article["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Article["updatedAt"]) ?? null,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    viewCount: (data.viewCount as number) ?? 0,
    shareCount: (data.shareCount as number) ?? 0,
  };
}

export interface FeedOptions {
  categoryId?: string | "all";
  max?: number;
}

export interface FeedPage {
  articles: Article[];
  /** Pass back as `after` to fetch the next page; null when the feed is done. */
  cursor: DocumentSnapshot | null;
}

export async function listPublishedArticles({
  categoryId = "all",
  max = 40,
}: FeedOptions = {}): Promise<Article[]> {
  const constraints: QueryConstraint[] = [where("status", "==", "published")];

  if (categoryId !== "all") {
    constraints.push(where("categoryId", "==", categoryId));
  }

  constraints.push(orderBy("publishedAt", "desc"), fbLimit(max));

  const snapshot = await getDocs(query(articlesCol(), ...constraints));
  const articles = snapshot.docs.map((entry) => toArticle(entry.id, entry.data()));

  // Pinned first, newest within each group. Sorting here rather than in the
  // query keeps it to a single composite index per filter.
  return articles.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.publishedAt?.toMillis() ?? 0) - (a.publishedAt?.toMillis() ?? 0);
  });
}

export async function getPublishedArticle(id: string): Promise<Article | null> {
  const snapshot = await getDoc(articleDoc(id));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  // A direct link to a draft or an unpublished story must 404 for the public.
  if (data.status !== "published") return null;

  return toArticle(snapshot.id, data);
}

/**
 * Paged feed, newest first.
 *
 * The original feed took a flat limit of 40 and stopped, which meant story 41
 * was unreachable from the site the day it was published — findable only by
 * someone who already had the link. This is the query behind "Load more" and
 * behind the archive, so nothing published ever falls off the end.
 */
export async function listPublishedPage({
  categoryId = "all",
  pageSize = 12,
  after = null,
  month = null,
}: {
  categoryId?: string | "all";
  pageSize?: number;
  after?: DocumentSnapshot | null;
  /** "YYYY-MM" to restrict to one month of the archive. */
  month?: string | null;
} = {}): Promise<FeedPage> {
  const constraints: QueryConstraint[] = [where("status", "==", "published")];

  if (categoryId !== "all") {
    constraints.push(where("categoryId", "==", categoryId));
  }

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const from = new Date(year, m - 1, 1);
    const to = new Date(year, m, 1);
    constraints.push(
      where("publishedAt", ">=", Timestamp.fromDate(from)),
      where("publishedAt", "<", Timestamp.fromDate(to)),
    );
  }

  constraints.push(orderBy("publishedAt", "desc"));
  if (after) constraints.push(startAfter(after));
  constraints.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(articlesCol(), ...constraints));
  const articles = snapshot.docs.map((entry) => toArticle(entry.id, entry.data()));

  return {
    articles,
    // A short page means there is nothing after it.
    cursor:
      snapshot.docs.length === pageSize
        ? (snapshot.docs[snapshot.docs.length - 1] ?? null)
        : null,
  };
}

/** Months that actually contain published stories, newest first. */
export async function listArchiveMonths(): Promise<
  Array<{ key: string; label: string; count: number }>
> {
  const snapshot = await getDocs(
    query(
      articlesCol(),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      fbLimit(1000),
    ),
  );

  const months = new Map<string, number>();
  for (const entry of snapshot.docs) {
    const published = entry.data().publishedAt as Timestamp | null | undefined;
    if (!published) continue;
    const date = published.toDate();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.set(key, (months.get(key) ?? 0) + 1);
  }

  return [...months.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, count]) => {
      const [year, m] = key.split("-").map(Number);
      return {
        key,
        label: new Date(year, m - 1, 1).toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        count,
      };
    });
}

export async function listMostRead(max = 5): Promise<Article[]> {
  const snapshot = await getDocs(
    query(
      articlesCol(),
      where("status", "==", "published"),
      orderBy("viewCount", "desc"),
      fbLimit(max),
    ),
  );
  return snapshot.docs.map((entry) => toArticle(entry.id, entry.data()));
}
