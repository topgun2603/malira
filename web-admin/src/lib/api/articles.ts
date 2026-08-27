import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { activityCol, articleDoc, articlesCol } from "@/lib/firebase/collections";
import { suffixedSlug } from "@/lib/slug";
import type {
  ActivityEntry,
  Article,
  ArticleDraft,
  ArticleStatus,
} from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

export interface ArticleFilters {
  status?: ArticleStatus | "all";
  categoryId?: string | "all";
  createdBy?: string;
  /** Client-side keyword match — see note in listArticles. */
  search?: string;
  max?: number;
}

function normalise(id: string, data: Record<string, unknown>): Article {
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
    status: (data.status as ArticleStatus) ?? "draft",
    pinned: Boolean(data.pinned),
    commentsEnabled: Boolean(data.commentsEnabled),
    publishAt: (data.publishAt as Article["publishAt"]) ?? null,
    publishedAt: (data.publishedAt as Article["publishedAt"]) ?? null,
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "",
    updatedBy: (data.updatedBy as string) ?? null,
    createdAt: (data.createdAt as Article["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Article["updatedAt"]) ?? null,
    reviewNote: (data.reviewNote as string) ?? null,
    reviewedBy: (data.reviewedBy as string) ?? null,
    reviewedAt: (data.reviewedAt as Article["reviewedAt"]) ?? null,
    viewCount: (data.viewCount as number) ?? 0,
    shareCount: (data.shareCount as number) ?? 0,
  };
}

/**
 * Status, category and author are filtered in Firestore. Keyword search is done
 * on the returned page in the browser: Firestore has no full-text search, and
 * at this collection's size (a district news desk, not a wire service) pulling
 * a page and filtering it is both cheaper and more forgiving than bolting on a
 * search service. If volume ever makes that false, the fix is Typesense — the
 * call site does not change.
 */
export async function listArticles(filters: ArticleFilters = {}): Promise<Article[]> {
  const constraints: QueryConstraint[] = [];

  if (filters.createdBy) constraints.push(where("createdBy", "==", filters.createdBy));
  if (filters.status && filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    constraints.push(where("categoryId", "==", filters.categoryId));
  }

  constraints.push(orderBy("updatedAt", "desc"));
  constraints.push(fbLimit(filters.max ?? 200));

  const snapshot = await getDocs(query(articlesCol(), ...constraints));
  const rows = snapshot.docs.map((d) => normalise(d.id, d.data()));

  const term = filters.search?.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((article) =>
    [article.title, article.titleTa, article.summary, article.authorName, ...article.tags]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

export async function getArticle(id: string): Promise<Article | null> {
  const snapshot = await getDoc(articleDoc(id));
  if (!snapshot.exists()) return null;
  return normalise(snapshot.id, snapshot.data());
}

interface Actor {
  uid: string;
  name: string;
}

async function logActivity(
  entry: Omit<ActivityEntry, "id" | "at">,
): Promise<void> {
  await addDoc(activityCol(), { ...entry, at: serverTimestamp() });
}

export async function createArticle(
  draft: ArticleDraft,
  status: ArticleStatus,
  actor: Actor,
): Promise<string> {
  const ref = await addDoc(articlesCol(), {
    ...draft,
    slug: suffixedSlug(draft.title, Date.now().toString(36)),
    status,
    publishAt: draft.publishAt ?? null,
    publishedAt: status === "published" ? serverTimestamp() : null,
    createdBy: actor.uid,
    createdByName: actor.name,
    updatedBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    viewCount: 0,
    shareCount: 0,
  });

  await logActivity({
    articleId: ref.id,
    articleTitle: draft.title,
    action: status === "in_review" ? "submitted" : "created",
    actorId: actor.uid,
    actorName: actor.name,
    note: null,
  });

  return ref.id;
}

export async function updateArticle(
  id: string,
  draft: ArticleDraft,
  actor: Actor,
): Promise<void> {
  await updateDoc(articleDoc(id), {
    ...draft,
    publishAt: draft.publishAt ?? null,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });

  await logActivity({
    articleId: id,
    articleTitle: draft.title,
    action: "updated",
    actorId: actor.uid,
    actorName: actor.name,
    note: null,
  });
}

export async function changeArticleStatus(
  article: Article,
  next: ArticleStatus,
  actor: Actor,
  note?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: next,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  };

  if (next === "published") {
    patch.publishedAt = article.publishedAt ?? serverTimestamp();
    patch.publishAt = null;
  }
  if (next === "rejected" || next === "published") {
    patch.reviewNote = note ?? null;
    patch.reviewedBy = actor.uid;
    patch.reviewedAt = serverTimestamp();
  }
  if (next === "unpublished") {
    patch.pinned = false;
  }

  await updateDoc(articleDoc(article.id), patch);

  const action: ActivityEntry["action"] =
    next === "published"
      ? "published"
      : next === "rejected"
        ? "rejected"
        : next === "in_review"
          ? "submitted"
          : next === "scheduled"
            ? "scheduled"
            : next === "unpublished"
              ? "unpublished"
              : "updated";

  await logActivity({
    articleId: article.id,
    articleTitle: article.title,
    action,
    actorId: actor.uid,
    actorName: actor.name,
    note: note ?? null,
  });
}

export async function setArticlePinned(
  article: Article,
  pinned: boolean,
  actor: Actor,
): Promise<void> {
  await updateDoc(articleDoc(article.id), {
    pinned,
    updatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteArticle(article: Article, actor: Actor): Promise<void> {
  await deleteDoc(articleDoc(article.id));
  await logActivity({
    articleId: article.id,
    articleTitle: article.title,
    action: "deleted",
    actorId: actor.uid,
    actorName: actor.name,
    note: null,
  });
}

export async function listRecentActivity(max = 12): Promise<ActivityEntry[]> {
  const snapshot = await getDocs(
    query(activityCol(), orderBy("at", "desc"), fbLimit(max)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityEntry);
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One page of the newsroom list.
 *
 * Keyword search stays out of this on purpose: Firestore has no full-text
 * index, so a search that paged on the server would only ever match the page it
 * had already fetched. The news screen therefore searches within the loaded
 * page and says so, and the day that stops being enough the answer is a search
 * service behind the same signature.
 */
export function articlesPage(filters: Omit<ArticleFilters, "search" | "max"> = {}) {
  const constraints: QueryConstraint[] = [];
  if (filters.createdBy) constraints.push(where("createdBy", "==", filters.createdBy));
  if (filters.status && filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    constraints.push(where("categoryId", "==", filters.categoryId));
  }
  constraints.push(orderBy("updatedAt", "desc"));

  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage("articles", constraints, normalise, after, pageSize),
    count: () => countCollection("articles", constraints.slice(0, -1)),
  };
}
