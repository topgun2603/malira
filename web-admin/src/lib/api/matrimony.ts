import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  startAfter,
  startAt,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type {
  ArticleImage,
  Diet,
  InterestStatus,
  MaritalStatus,
  MatrimonyContact,
  MatrimonyInterest,
  MatrimonyProfile,
  MatrimonyReport,
  MatrimonyStatus,
  PhotoVisibility,
  PostedBy,
} from "@/lib/types";
import { MIN_AGE_BY_GENDER } from "@/lib/types";

const PROFILES = "matrimonyProfiles";
const INTERESTS = "matrimonyInterests";
const REPORTS = "matrimonyReports";

/**
 * Matrimony data access.
 *
 * Two rules shape everything here:
 *
 * 1. **A profile's document id is its owner's uid.** One profile per account
 *    falls out for free, and the security rules can answer "is this yours?"
 *    without a lookup.
 * 2. **Contact details never live on the profile document.** Firestore has no
 *    field-level security, so a phone number on the main document would be
 *    readable by anyone allowed to read the profile. Phone, email and
 *    restricted photos live in a `private/contact` subcollection whose read
 *    rule requires an accepted interest.
 */

const profileDoc = (uid: string) => doc(db, PROFILES, uid);
const contactDoc = (uid: string) => doc(db, PROFILES, uid, "private", "contact");
const interestId = (fromUid: string, toUid: string) => `${fromUid}__${toUid}`;

function toProfile(id: string, data: Record<string, unknown>): MatrimonyProfile {
  return {
    id,
    ownerUid: (data.ownerUid as string) ?? id,
    postedBy: (data.postedBy as PostedBy) ?? "self",
    name: (data.name as string) ?? "",
    gender: (data.gender as "male" | "female") ?? "female",
    dob: (data.dob as MatrimonyProfile["dob"]) ?? null,
    birthTime: (data.birthTime as string) ?? "",
    birthPlace: (data.birthPlace as string) ?? "",
    heightCm: (data.heightCm as number) ?? 0,
    maritalStatus: (data.maritalStatus as MaritalStatus) ?? "never_married",
    diet: (data.diet as Diet) ?? "vegetarian",
    education: (data.education as string) ?? "",
    occupation: (data.occupation as string) ?? "",
    workLocation: (data.workLocation as string) ?? "",
    hometown: (data.hometown as string) ?? "",
    motherTongue: (data.motherTongue as string) ?? "",
    about: (data.about as string) ?? "",
    fatherOccupation: (data.fatherOccupation as string) ?? "",
    motherOccupation: (data.motherOccupation as string) ?? "",
    siblings: (data.siblings as string) ?? "",
    photoVisibility: (data.photoVisibility as PhotoVisibility) ?? "on_accept",
    photos: (data.photos as ArticleImage[]) ?? [],
    hasPhotos: Boolean(data.hasPhotos),
    status: (data.status as MatrimonyStatus) ?? "pending",
    pausedFrom: (data.pausedFrom as MatrimonyStatus) ?? null,
    reviewNote: (data.reviewNote as string) ?? null,
    reviewedBy: (data.reviewedBy as string) ?? null,
    reviewedAt: (data.reviewedAt as MatrimonyProfile["reviewedAt"]) ?? null,
    createdAt: (data.createdAt as MatrimonyProfile["createdAt"]) ?? null,
    updatedAt: (data.updatedAt as MatrimonyProfile["updatedAt"]) ?? null,
    viewCount: (data.viewCount as number) ?? 0,
  };
}

export function ageFrom(dob: Timestamp | null): number | null {
  if (!dob) return null;
  const birth = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

/* -------------------------------------------------------------------------- */
/*  Profiles                                                                   */
/* -------------------------------------------------------------------------- */

export interface ProfileDraft {
  postedBy: PostedBy;
  name: string;
  gender: "male" | "female";
  dob: Date | null;
  birthTime: string;
  birthPlace: string;
  heightCm: number;
  maritalStatus: MaritalStatus;
  diet: Diet;
  education: string;
  occupation: string;
  workLocation: string;
  hometown: string;
  motherTongue: string;
  about: string;
  fatherOccupation: string;
  motherOccupation: string;
  siblings: string;
  photoVisibility: PhotoVisibility;
  photos: ArticleImage[];
  phone: string;
  email: string;
  horoscopeNote: string;
  /** A photograph of the jathagam. Private, like the phone number. */
  horoscopeImage: ArticleImage | null;
}

/** Returns a human message when the draft cannot be saved, otherwise null. */
export function validateProfile(draft: ProfileDraft): string | null {
  if (!draft.name.trim()) return "A name is required.";
  if (!draft.dob) return "A date of birth is required.";
  if (!draft.phone.trim()) return "A contact number is required.";

  const age = ageFrom(Timestamp.fromDate(draft.dob));
  const minimum = MIN_AGE_BY_GENDER[draft.gender];
  if (age === null || age < minimum) {
    return `The legal minimum marriage age in India is ${minimum} for a ${draft.gender === "male" ? "man" : "woman"}. This profile cannot be listed.`;
  }
  if (age > 100) return "Check the date of birth.";
  return null;
}

export async function getProfile(uid: string): Promise<MatrimonyProfile | null> {
  const snapshot = await getDoc(profileDoc(uid));
  if (!snapshot.exists()) return null;
  return toProfile(snapshot.id, snapshot.data());
}

/** Throws permission-denied unless the caller has earned the contact details. */
export async function getContact(uid: string): Promise<MatrimonyContact | null> {
  const snapshot = await getDoc(contactDoc(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    phone: (data.phone as string) ?? "",
    email: (data.email as string) ?? "",
    photos: (data.photos as ArticleImage[]) ?? [],
    horoscopeNote: (data.horoscopeNote as string) ?? "",
    horoscopeImage: (data.horoscopeImage as ArticleImage) ?? null,
  };
}

/**
 * Saves a profile and its contact document in one batch.
 *
 * Editing always returns the profile to "pending". A member cannot approve
 * their own listing, and a profile that changed after approval has not been
 * reviewed in its current form.
 */
export async function saveProfile(
  uid: string,
  draft: ProfileDraft,
): Promise<void> {
  const restricted = draft.photoVisibility === "on_accept";

  // A merge write would otherwise stamp createdAt again on every edit, so a
  // long-standing profile would keep looking brand new.
  const existing = await getDoc(profileDoc(uid));
  const isNew = !existing.exists();

  const batch = writeBatch(db);

  batch.set(
    profileDoc(uid),
    {
      ownerUid: uid,
      postedBy: draft.postedBy,
      name: draft.name,
      // Lower-cased copy so a name search can be a Firestore range scan
      // rather than a download-everything-and-filter.
      nameLower: draft.name.trim().toLowerCase(),
      gender: draft.gender,
      dob: draft.dob ? Timestamp.fromDate(draft.dob) : null,
      birthTime: draft.birthTime,
      birthPlace: draft.birthPlace,
      heightCm: draft.heightCm,
      maritalStatus: draft.maritalStatus,
      diet: draft.diet,
      education: draft.education,
      occupation: draft.occupation,
      workLocation: draft.workLocation,
      hometown: draft.hometown,
      motherTongue: draft.motherTongue,
      about: draft.about,
      fatherOccupation: draft.fatherOccupation,
      motherOccupation: draft.motherOccupation,
      siblings: draft.siblings,
      photoVisibility: draft.photoVisibility,
      // Restricted photos are withheld from the public document entirely.
      photos: restricted ? [] : draft.photos,
      hasPhotos: draft.photos.length > 0,
      status: "pending" as MatrimonyStatus,
      // An edit clears the pause it may have been carrying: the profile a
      // moderator approved is not the profile now on the document, so there is
      // nothing left to resume straight back into.
      pausedFrom: null,
      reviewNote: null,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp(), viewCount: 0 } : {}),
    },
    { merge: true },
  );

  // Merged, not replaced.
  //
  // The app writes a horoscope image into this same document, and a plain
  // `set` here would erase it every time somebody edited their profile from
  // the desk — a silent data loss that only the owner would ever notice.
  batch.set(
    contactDoc(uid),
    {
      phone: draft.phone,
      email: draft.email,
      photos: draft.photos,
      horoscopeNote: draft.horoscopeNote,
      horoscopeImage: draft.horoscopeImage,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

export async function setOwnStatus(
  uid: string,
  status: Extract<MatrimonyStatus, "paused" | "married" | "pending">,
  /** Required when pausing: the status being left, which the rules verify. */
  current?: MatrimonyStatus,
): Promise<void> {
  await updateDoc(profileDoc(uid), {
    status,
    ...(status === "paused" ? { pausedFrom: current ?? null } : {}),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Put a paused listing back.
 *
 * A listing that was approved when it was paused returns to approved rather
 * than to the back of the queue: nothing about it changed while it was hidden,
 * so there is nothing for a moderator to read a second time. One that was
 * still pending resumes as pending, where it already was.
 */
export async function resumeOwnListing(
  uid: string,
  pausedFrom: MatrimonyStatus | null,
): Promise<MatrimonyStatus> {
  const status: MatrimonyStatus =
    pausedFrom === "approved" ? "approved" : "pending";
  // Exactly these three keys: the rules allow the return to approved only if
  // nothing else on the profile moves with it.
  await updateDoc(profileDoc(uid), {
    status,
    pausedFrom: null,
    updatedAt: serverTimestamp(),
  });
  return status;
}

export async function deleteProfile(uid: string): Promise<void> {
  // The subcollection has to go first: deleting a parent leaves children.
  await deleteDoc(contactDoc(uid)).catch(() => undefined);
  await deleteDoc(profileDoc(uid));
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                     */
/* -------------------------------------------------------------------------- */

export interface MatrimonyFilters {
  /** The caller's own uid, so their listing is kept out of their results. */
  excludeUid?: string;
  gender?: "male" | "female" | "all";
  minAge?: number;
  maxAge?: number;
  maritalStatus?: MaritalStatus | "all";
  diet?: Diet | "all";
  hometown?: string;
  search?: string;
}

/**
 * Approved profiles only.
 *
 * Gender is filtered in Firestore; age, diet and free text are filtered on the
 * returned page. Age is derived from a date of birth, so a Firestore range
 * would need a stored age field kept in sync by a scheduled job — not worth it
 * at this size, and a stale age is worse than a slightly larger read.
 */
export async function searchProfiles(
  filters: MatrimonyFilters = {},
): Promise<MatrimonyProfile[]> {
  const constraints: QueryConstraint[] = [where("status", "==", "approved")];

  if (filters.gender && filters.gender !== "all") {
    constraints.push(where("gender", "==", filters.gender));
  }

  constraints.push(orderBy("updatedAt", "desc"), fbLimit(200));

  const snapshot = await getDocs(query(collection(db, PROFILES), ...constraints));
  let rows = snapshot.docs.map((entry) => toProfile(entry.id, entry.data()));

  // Nobody needs their own listing in their search results, and it should not
  // count towards the free allowance either.
  if (filters.excludeUid) {
    rows = rows.filter((row) => row.id !== filters.excludeUid);
  }

  if (filters.maritalStatus && filters.maritalStatus !== "all") {
    rows = rows.filter((row) => row.maritalStatus === filters.maritalStatus);
  }
  if (filters.diet && filters.diet !== "all") {
    rows = rows.filter((row) => row.diet === filters.diet);
  }
  if (filters.minAge || filters.maxAge) {
    rows = rows.filter((row) => {
      const age = ageFrom(row.dob);
      if (age === null) return false;
      if (filters.minAge && age < filters.minAge) return false;
      if (filters.maxAge && age > filters.maxAge) return false;
      return true;
    });
  }
  if (filters.hometown?.trim()) {
    const term = filters.hometown.trim().toLowerCase();
    rows = rows.filter((row) => row.hometown.toLowerCase().includes(term));
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter((row) =>
      [row.name, row.education, row.occupation, row.workLocation, row.hometown]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Interests                                                                  */
/* -------------------------------------------------------------------------- */

function toInterest(id: string, data: Record<string, unknown>): MatrimonyInterest {
  return {
    id,
    fromUid: (data.fromUid as string) ?? "",
    toUid: (data.toUid as string) ?? "",
    fromName: (data.fromName as string) ?? "",
    toName: (data.toName as string) ?? "",
    status: (data.status as InterestStatus) ?? "sent",
    createdAt: (data.createdAt as MatrimonyInterest["createdAt"]) ?? null,
    respondedAt: (data.respondedAt as MatrimonyInterest["respondedAt"]) ?? null,
  };
}

export async function sendInterest(input: {
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
}): Promise<void> {
  if (input.fromUid === input.toUid) {
    throw new Error("You cannot send an interest to your own profile.");
  }
  await setDoc(doc(db, INTERESTS, interestId(input.fromUid, input.toUid)), {
    ...input,
    status: "sent" as InterestStatus,
    createdAt: serverTimestamp(),
    respondedAt: null,
  });
}

export async function respondToInterest(
  id: string,
  status: Extract<InterestStatus, "accepted" | "declined">,
): Promise<void> {
  await updateDoc(doc(db, INTERESTS, id), {
    status,
    respondedAt: serverTimestamp(),
  });
}

export async function withdrawInterest(id: string): Promise<void> {
  await updateDoc(doc(db, INTERESTS, id), {
    status: "withdrawn" as InterestStatus,
    respondedAt: serverTimestamp(),
  });
}

export async function listSentInterests(uid: string): Promise<MatrimonyInterest[]> {
  const snapshot = await getDocs(
    query(collection(db, INTERESTS), where("fromUid", "==", uid)),
  );
  return snapshot.docs.map((entry) => toInterest(entry.id, entry.data()));
}

export async function listReceivedInterests(
  uid: string,
): Promise<MatrimonyInterest[]> {
  const snapshot = await getDocs(
    query(collection(db, INTERESTS), where("toUid", "==", uid)),
  );
  return snapshot.docs.map((entry) => toInterest(entry.id, entry.data()));
}

/** True when the two accounts have an accepted interest in either direction. */
export function isMatched(
  interests: MatrimonyInterest[],
  a: string,
  b: string,
): boolean {
  return interests.some(
    (interest) =>
      interest.status === "accepted" &&
      ((interest.fromUid === a && interest.toUid === b) ||
        (interest.fromUid === b && interest.toUid === a)),
  );
}

/* -------------------------------------------------------------------------- */
/*  Moderation                                                                 */
/* -------------------------------------------------------------------------- */

export async function listProfilesForModeration(
  status: MatrimonyStatus | "all" = "pending",
): Promise<MatrimonyProfile[]> {
  const constraints: QueryConstraint[] = [];
  if (status !== "all") constraints.push(where("status", "==", status));
  constraints.push(orderBy("updatedAt", "desc"), fbLimit(200));

  const snapshot = await getDocs(query(collection(db, PROFILES), ...constraints));
  return snapshot.docs.map((entry) => toProfile(entry.id, entry.data()));
}

export async function moderateProfile(
  uid: string,
  status: MatrimonyStatus,
  actor: { uid: string },
  note?: string,
): Promise<void> {
  await updateDoc(profileDoc(uid), {
    status,
    reviewNote: note ?? null,
    reviewedBy: actor.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function reportProfile(input: {
  profileId: string;
  profileName: string;
  reporterUid: string;
  reason: string;
}): Promise<void> {
  await setDoc(doc(collection(db, REPORTS)), {
    ...input,
    resolved: false,
    createdAt: serverTimestamp(),
  });
}

export async function listReports(): Promise<MatrimonyReport[]> {
  const snapshot = await getDocs(
    query(collection(db, REPORTS), orderBy("createdAt", "desc"), fbLimit(100)),
  );
  return snapshot.docs.map(
    (entry) => ({ id: entry.id, ...entry.data() }) as MatrimonyReport,
  );
}

export async function resolveReport(id: string): Promise<void> {
  await updateDoc(doc(db, REPORTS, id), { resolved: true });
}

/* -------------------------------------------------------------------------- */
/*  Moderation, paged on the server                                            */
/* -------------------------------------------------------------------------- */

export interface ModerationFilters {
  status?: MatrimonyStatus | "all";
  gender?: "male" | "female" | "all";
  maritalStatus?: MaritalStatus | "all";
  /** Name prefix. See the note in listProfilesPage about why only the name. */
  search?: string;
  pageSize?: number;
  after?: DocumentSnapshot | null;
}

export interface ModerationPage {
  profiles: MatrimonyProfile[];
  /** Pass back as `after` for the next page; null when this page is the last. */
  cursor: DocumentSnapshot | null;
}

/**
 * One page of the moderation queue, fetched from Firestore rather than sliced
 * in the browser.
 *
 * Status, gender and marital status are real `where` clauses, so paging is
 * over the filtered set and not over a 200-row window that happened to be
 * loaded.
 *
 * Search is a **name prefix only**, and deliberately so. Firestore has no
 * full-text index; matching education or occupation would mean either pulling
 * the whole collection down to filter it — which is the thing this function
 * exists to stop — or running a search service. When that day comes the answer
 * is Typesense behind this same signature, and no caller changes.
 *
 * While searching, gender and marital status are applied to the returned page
 * rather than the query: Firestore cannot combine a range scan on one field
 * with equality on others without a composite index per combination, and that
 * is four indexes to serve a box people type two letters into.
 */
export async function listProfilesPage({
  status = "pending",
  gender = "all",
  maritalStatus = "all",
  search = "",
  pageSize = 25,
  after = null,
}: ModerationFilters = {}): Promise<ModerationPage> {
  const term = search.trim().toLowerCase();
  const constraints: QueryConstraint[] = [];

  if (status !== "all") constraints.push(where("status", "==", status));

  if (term) {
    constraints.push(orderBy("nameLower", "asc"));
    constraints.push(startAt(term), endAt(`${term}`));
  } else {
    if (gender !== "all") constraints.push(where("gender", "==", gender));
    if (maritalStatus !== "all") {
      constraints.push(where("maritalStatus", "==", maritalStatus));
    }
    constraints.push(orderBy("updatedAt", "desc"));
    if (after) constraints.push(startAfter(after));
  }

  constraints.push(fbLimit(pageSize));

  const snapshot = await getDocs(query(collection(db, PROFILES), ...constraints));
  let profiles = snapshot.docs.map((entry) => toProfile(entry.id, entry.data()));

  if (term) {
    if (gender !== "all") profiles = profiles.filter((p) => p.gender === gender);
    if (maritalStatus !== "all") {
      profiles = profiles.filter((p) => p.maritalStatus === maritalStatus);
    }
  }

  return {
    profiles,
    // A short page means there is nothing after it. Searching is single-page.
    cursor:
      !term && snapshot.docs.length === pageSize
        ? (snapshot.docs[snapshot.docs.length - 1] ?? null)
        : null,
  };
}

/**
 * How many profiles match, without reading them.
 *
 * Firestore bills an aggregation at roughly one read per thousand documents
 * counted, which is what makes "page 2 of 9" affordable at all.
 */
export async function countProfiles({
  status = "pending",
  gender = "all",
  maritalStatus = "all",
}: Omit<ModerationFilters, "search" | "pageSize" | "after"> = {}): Promise<number> {
  const constraints: QueryConstraint[] = [];
  if (status !== "all") constraints.push(where("status", "==", status));
  if (gender !== "all") constraints.push(where("gender", "==", gender));
  if (maritalStatus !== "all") {
    constraints.push(where("maritalStatus", "==", maritalStatus));
  }
  const snapshot = await getCountFromServer(
    query(collection(db, PROFILES), ...constraints),
  );
  return snapshot.data().count;
}
