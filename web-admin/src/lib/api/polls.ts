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
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Poll, PollOption, PollStatus } from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";

const COLLECTION = "polls";
const VOTED_KEY = "nilgiri-news:voted";

const pollsCol = () => collection(db, COLLECTION);
const pollDoc = (id: string) => doc(db, COLLECTION, id);

function toPoll(id: string, data: Record<string, unknown>): Poll {
  return {
    id,
    question: (data.question as string) ?? "",
    questionTa: (data.questionTa as string) ?? "",
    options: (data.options as PollOption[]) ?? [],
    counts: (data.counts as Record<string, number>) ?? {},
    totalVotes: (data.totalVotes as number) ?? 0,
    status: (data.status as PollStatus) ?? "draft",
    placement: (data.placement as Poll["placement"]) ?? "sidebar",
    closesAt: (data.closesAt as Poll["closesAt"]) ?? null,
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "",
    createdAt: (data.createdAt as Poll["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as Poll["updatedAt"]) ?? null,
  };
}

export async function listPolls(): Promise<Poll[]> {
  const snapshot = await getDocs(query(pollsCol(), orderBy("createdAt", "desc")));
  return snapshot.docs.map((entry) => toPoll(entry.id, entry.data()));
}

/** Reader side: at most one running poll per surface. */
export async function getActivePoll(
  surface: "sidebar" | "article",
): Promise<Poll | null> {
  const snapshot = await getDocs(
    query(
      pollsCol(),
      where("status", "==", "active"),
      where("placement", "in", [surface, "both"]),
    ),
  );
  if (snapshot.empty) return null;

  const polls = snapshot.docs.map((entry) => toPoll(entry.id, entry.data()));
  const now = Date.now();
  const open = polls.filter(
    (poll) => !poll.closesAt || poll.closesAt.toMillis() > now,
  );
  if (open.length === 0) return null;

  // Newest first, so replacing a poll is just publishing a new one.
  open.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  return open[0];
}

export interface PollDraft {
  question: string;
  questionTa: string;
  options: PollOption[];
  placement: Poll["placement"];
  closesAt: Date | null;
}

export async function createPoll(
  draft: PollDraft,
  actor: { uid: string; name: string },
): Promise<string> {
  const counts: Record<string, number> = {};
  draft.options.forEach((option) => {
    counts[option.id] = 0;
  });

  const ref = await addDoc(pollsCol(), {
    ...draft,
    closesAt: draft.closesAt ? Timestamp.fromDate(draft.closesAt) : null,
    counts,
    totalVotes: 0,
    status: "draft" as PollStatus,
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePoll(id: string, draft: PollDraft): Promise<void> {
  await updateDoc(pollDoc(id), {
    question: draft.question,
    questionTa: draft.questionTa,
    options: draft.options,
    placement: draft.placement,
    closesAt: draft.closesAt ? Timestamp.fromDate(draft.closesAt) : null,
    updatedAt: serverTimestamp(),
  });
}

export async function setPollStatus(id: string, status: PollStatus): Promise<void> {
  await updateDoc(pollDoc(id), { status, updatedAt: serverTimestamp() });
}

export async function deletePoll(id: string): Promise<void> {
  await deleteDoc(pollDoc(id));
}

/* -------------------------------------------------------------------------- */
/*  Voting                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One vote per browser, remembered in localStorage.
 *
 * This is a community opinion poll, not a ballot. A determined person can clear
 * their storage and vote again, and the security rules deliberately allow any
 * visitor to increment a counter — requiring sign-in to answer a poll would
 * kill participation. What the rules *do* enforce is that a vote can only ever
 * add one to one option of a running poll, so the worst case is a skewed poll,
 * never a corrupted document.
 */
export function readVotedOptions(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(VOTED_KEY) ?? "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function rememberVote(pollId: string, optionId: string) {
  try {
    const all = readVotedOptions();
    all[pollId] = optionId;
    window.localStorage.setItem(VOTED_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked; the vote still counts, the reader may just be asked again.
  }
}

export async function castVote(pollId: string, optionId: string): Promise<void> {
  await updateDoc(pollDoc(pollId), {
    [`counts.${optionId}`]: increment(1),
    totalVotes: increment(1),
  });
  rememberVote(pollId, optionId);
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

/** One page of the polls list, newest first. */
export function pollsPage() {
  const constraints = [orderBy("createdAt", "desc")];
  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(COLLECTION, constraints, toPoll, after, pageSize),
    count: () => countCollection(COLLECTION),
  };
}
