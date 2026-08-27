import {
  collection,
  getCountFromServer,
  getDocs,
  limit as fbLimit,
  query,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Page } from "@/hooks/use-server-page";

/**
 * One page of a collection, with the cursor for the next.
 *
 * Every admin list pages through this, so "how do I fetch a page" is answered
 * once. Callers supply their own `where`/`orderBy` constraints; this adds the
 * cursor and the limit, and works out whether a further page exists.
 *
 * Note the ordering rule Firestore imposes: the constraints must already end
 * with the orderBy the cursor is measured against, or startAfter has nothing
 * to compare.
 */
export async function fetchCollectionPage<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  map: (id: string, data: Record<string, unknown>) => T,
  after: DocumentSnapshot | null,
  pageSize: number,
): Promise<Page<T>> {
  const all = [...constraints];
  if (after) all.push(startAfter(after));
  all.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(collection(db, collectionName), ...all));

  return {
    items: snapshot.docs.map((entry) => map(entry.id, entry.data())),
    // A short page is the last page; no extra read needed to find that out.
    cursor:
      snapshot.docs.length === pageSize
        ? (snapshot.docs[snapshot.docs.length - 1] ?? null)
        : null,
  };
}

/**
 * How many documents match, without reading them.
 *
 * Firestore bills an aggregation at roughly one read per thousand documents
 * counted, which is what makes an exact "page 2 of 9" affordable.
 */
export async function countCollection(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<number> {
  const snapshot = await getCountFromServer(
    query(collection(db, collectionName), ...constraints),
  );
  return snapshot.data().count;
}
