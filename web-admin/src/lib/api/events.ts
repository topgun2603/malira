import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type {
  ArticleImage,
  EventCategory,
  EventItem,
  EventStatus,
  Recurrence,
} from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

const COLLECTION = "events";

const eventsCol = () => collection(db, COLLECTION);
const eventDoc = (id: string) => doc(db, COLLECTION, id);

function toEvent(id: string, data: Record<string, unknown>): EventItem {
  return {
    id,
    title: (data.title as string) ?? "",
    titleTa: (data.titleTa as string) ?? "",
    description: (data.description as string) ?? "",
    descriptionTa: (data.descriptionTa as string) ?? "",
    category: (data.category as EventCategory) ?? "meeting",
    startsAt: (data.startsAt as EventItem["startsAt"]) ?? null,
    endsAt: (data.endsAt as EventItem["endsAt"]) ?? null,
    venue: (data.venue as string) ?? "",
    venueTa: (data.venueTa as string) ?? "",
    mapUrl: (data.mapUrl as string) ?? "",
    organiserName: (data.organiserName as string) ?? "",
    organiserPhone: (data.organiserPhone as string) ?? "",
    poster: (data.poster as ArticleImage | null) ?? null,
    recurrence: (data.recurrence as Recurrence) ?? "none",
    status: (data.status as EventStatus) ?? "draft",
    archived: Boolean(data.archived),
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "",
    createdAt: (data.createdAt as EventItem["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as EventItem["updatedAt"]) ?? null,
  };
}

export interface EventFilters {
  status?: EventStatus | "all";
  category?: EventCategory | "all";
  archived?: boolean;
  max?: number;
}

export async function listEvents(filters: EventFilters = {}): Promise<EventItem[]> {
  const constraints: QueryConstraint[] = [];

  if (filters.status && filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters.category && filters.category !== "all") {
    constraints.push(where("category", "==", filters.category));
  }
  if (filters.archived !== undefined) {
    constraints.push(where("archived", "==", filters.archived));
  }

  constraints.push(orderBy("startsAt", "desc"), fbLimit(filters.max ?? 200));

  const snapshot = await getDocs(query(eventsCol(), ...constraints));
  return snapshot.docs.map((entry) => toEvent(entry.id, entry.data()));
}

/** Reader side: published, not archived, soonest first. */
export async function listUpcomingEvents(max = 60): Promise<EventItem[]> {
  const snapshot = await getDocs(
    query(
      eventsCol(),
      where("status", "==", "published"),
      where("archived", "==", false),
      orderBy("startsAt", "asc"),
      fbLimit(max),
    ),
  );
  return snapshot.docs.map((entry) => toEvent(entry.id, entry.data()));
}

export async function getPublishedEvent(id: string): Promise<EventItem | null> {
  const snapshot = await getDoc(eventDoc(id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.status !== "published") return null;
  return toEvent(snapshot.id, data);
}

export interface EventDraft {
  title: string;
  titleTa: string;
  description: string;
  descriptionTa: string;
  category: EventCategory;
  startsAt: Date | null;
  endsAt: Date | null;
  venue: string;
  venueTa: string;
  mapUrl: string;
  organiserName: string;
  organiserPhone: string;
  poster: ArticleImage | null;
  recurrence: Recurrence;
}

function serialise(draft: EventDraft) {
  return {
    ...draft,
    startsAt: draft.startsAt ? Timestamp.fromDate(draft.startsAt) : null,
    endsAt: draft.endsAt ? Timestamp.fromDate(draft.endsAt) : null,
  };
}

export async function createEvent(
  draft: EventDraft,
  status: EventStatus,
  actor: { uid: string; name: string },
): Promise<string> {
  const ref = await addDoc(eventsCol(), {
    ...serialise(draft),
    status,
    archived: false,
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(id: string, draft: EventDraft): Promise<void> {
  await updateDoc(eventDoc(id), { ...serialise(draft), updatedAt: serverTimestamp() });
}

export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  await updateDoc(eventDoc(id), { status, updatedAt: serverTimestamp() });
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteDoc(eventDoc(id));
}

/**
 * Moves finished events out of the upcoming list.
 *
 * Run from the admin rather than a scheduled Cloud Function, because a Function
 * needs the Blaze plan and this is a once-a-day sweep over a handful of rows.
 * Recurring events are rolled forward to their next occurrence instead of being
 * archived — an annual festival should never disappear from the calendar.
 */
export async function archivePastEvents(): Promise<{
  archived: number;
  rolled: number;
}> {
  const now = new Date();
  const snapshot = await getDocs(
    query(
      eventsCol(),
      where("archived", "==", false),
      where("status", "==", "published"),
    ),
  );

  const batch = writeBatch(db);
  let archived = 0;
  let rolled = 0;

  for (const entry of snapshot.docs) {
    const event = toEvent(entry.id, entry.data());
    const finished = event.endsAt ?? event.startsAt;
    if (!finished || finished.toDate() >= now) continue;

    if (event.recurrence === "none") {
      batch.update(entry.ref, { archived: true, updatedAt: serverTimestamp() });
      archived += 1;
      continue;
    }

    const next = rollForward(finished.toDate(), event.recurrence, now);
    const span =
      event.endsAt && event.startsAt
        ? event.endsAt.toMillis() - event.startsAt.toMillis()
        : 0;

    batch.update(entry.ref, {
      startsAt: Timestamp.fromDate(next),
      endsAt: span > 0 ? Timestamp.fromDate(new Date(next.getTime() + span)) : null,
      updatedAt: serverTimestamp(),
    });
    rolled += 1;
  }

  if (archived + rolled > 0) await batch.commit();
  return { archived, rolled };
}

/** Advances a past date by its recurrence until it lands in the future. */
function rollForward(from: Date, recurrence: Recurrence, now: Date): Date {
  const next = new Date(from);
  // Bounded so a very old recurring event cannot spin here.
  for (let guard = 0; guard < 500 && next < now; guard += 1) {
    if (recurrence === "weekly") next.setDate(next.getDate() + 7);
    else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    else next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/** One page of the events list, ordered newest first. */
export function eventsPage(filters: EventFilters = {}) {
  const constraints: QueryConstraint[] = [];
  if (filters.status && filters.status !== "all") {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters.category && filters.category !== "all") {
    constraints.push(where("category", "==", filters.category));
  }
  if (filters.archived !== undefined) {
    constraints.push(where("archived", "==", filters.archived));
  }
  constraints.push(orderBy("startsAt", "desc"));

  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(COLLECTION, constraints, toEvent, after, pageSize),
    count: () => countCollection(COLLECTION, constraints.slice(0, -1)),
  };
}
