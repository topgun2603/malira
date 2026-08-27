import {
  doc,
  endAt,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS, userDoc, usersCol } from "@/lib/firebase/collections";
import type { AdminUser, Role } from "@/lib/types";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";
import type { Page } from "@/hooks/use-server-page";

/**
 * Lower-cased copies of the two fields anybody searches by.
 *
 * Firestore has no case-insensitive comparison and no full-text index, so a
 * search is a range scan over an ordered field — which means the field has to
 * already be in the case the scan is written in. Same trick as `nameLower` on a
 * matrimony profile.
 */
function searchKeys(displayName: string, email: string) {
  return {
    displayNameLower: displayName.trim().toLowerCase(),
    emailLower: email.trim().toLowerCase(),
  };
}

/** Write-once sentinel that marks the Super Admin seat as taken. */
const BOOTSTRAP_DOC = "bootstrap";

export async function getAdminUser(uid: string): Promise<AdminUser | null> {
  const snapshot = await getDoc(userDoc(uid));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as AdminUser;
}

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(userDoc(uid), { role });
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(userDoc(uid), { disabled });
}

/**
 * Called after every successful sign-in.
 *
 * The very first account ever to sign in becomes Super Admin so the panel can
 * be bootstrapped without the Admin SDK; everyone after that lands as a
 * Member — a reader with no desk access whatsoever — and is promoted from
 * Users & roles. Contributor was the old default, which meant anyone who signed
 * in could submit articles; with matrimony open to the public that became a
 * hole rather than a convenience.
 *
 * "First ever" is tracked by settings/bootstrap, not by counting users. The
 * profile and the sentinel are written in a single batch: Firestore evaluates
 * every rule in a batch against the pre-batch state, so the sentinel check is
 * still false for both writes, and any second attempt fails at the rules layer
 * rather than relying on this client to behave.
 */
export async function ensureUserProfile(input: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}): Promise<AdminUser> {
  const existing = await getAdminUser(input.uid);

  if (existing) {
    // The search keys ride along on a write that was happening anyway, so an
    // account created before the directory was searchable heals itself the
    // next time its owner signs in. The rules allow it: a person may write
    // their own document as long as role and disabled are untouched.
    await updateDoc(userDoc(input.uid), {
      lastLoginAt: serverTimestamp(),
      ...searchKeys(existing.displayName, existing.email),
    });
    return existing;
  }

  const bootstrapRef = doc(db, COLLECTIONS.settings, BOOTSTRAP_DOC);
  const seatTaken = (await getDoc(bootstrapRef)).exists();

  const displayName = input.displayName || input.email.split("@")[0];

  const profile = {
    email: input.email,
    displayName,
    ...searchKeys(displayName, input.email),
    photoURL: input.photoURL ?? null,
    role: (seatTaken ? "member" : "super_admin") as Role,
    disabled: false,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  if (seatTaken) {
    await setDoc(userDoc(input.uid), profile);
  } else {
    const batch = writeBatch(db);
    batch.set(userDoc(input.uid), profile);
    batch.set(bootstrapRef, {
      claimedBy: input.uid,
      claimedByEmail: input.email,
      claimedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  return { id: input.uid, ...profile, createdAt: null, lastLoginAt: null };
}

/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

export interface UserFilters {
  role?: Role | "all";
  /** Whether the account can still sign in. */
  status?: "all" | "enabled" | "disabled";
  search?: string;
}

/**
 * Which field a search term scans.
 *
 * An `@` means the admin is typing an address; anything else is a name. One
 * field per query is not a simplification, it is the constraint — a range scan
 * has to be ordered by the field it scans, and Firestore allows exactly one
 * such ordering per query. Searching both at once would mean two queries and a
 * merge, and a merged result has no single cursor to page with.
 *
 * Prefixes only, in both cases: `` sorts after every character Firestore
 * will store, so `startAt(term)` to `endAt(term + )` is exactly the range
 * of values that begin with the term.
 */
function searchScan(term: string): QueryConstraint[] {
  const field = term.includes("@") ? "emailLower" : "displayNameLower";
  return [orderBy(field, "asc"), startAt(term), endAt(`${term}`)];
}

/**
 * One page of the staff and member directory.
 *
 * Everyone who has ever signed in is in here — matrimony is open to the public,
 * so this collection grows with the readership and not with the desk. That is
 * why role and status are real `where` clauses rather than a filter over rows
 * that have already been fetched.
 *
 * While a search is running they are applied to the returned page instead:
 * combining a range scan with equality on another field needs a composite index
 * per combination, which is a dozen indexes to serve a box people type two
 * letters into. Searching is therefore single-page — an admin searching is
 * looking for one person, not paging a result set.
 */
export function usersPage({ role = "all", status = "all", search = "" }: UserFilters = {}) {
  const term = search.trim().toLowerCase();

  const constraints: QueryConstraint[] = [];
  if (term) {
    constraints.push(...searchScan(term));
  } else {
    if (role !== "all") constraints.push(where("role", "==", role));
    if (status !== "all") constraints.push(where("disabled", "==", status === "disabled"));
    constraints.push(orderBy("displayName", "asc"));
  }

  async function fetchPage(
    after: DocumentSnapshot | null,
    pageSize: number,
  ): Promise<Page<AdminUser>> {
    if (!term) {
      return fetchCollectionPage(
        COLLECTIONS.users,
        constraints,
        (id, data) => ({ id, ...data }) as AdminUser,
        after,
        pageSize,
      );
    }

    const snapshot = await getDocs(query(usersCol(), ...constraints, fbLimit(pageSize)));

    let items = snapshot.docs.map(
      (entry) => ({ id: entry.id, ...entry.data() }) as AdminUser,
    );
    if (role !== "all") items = items.filter((user) => user.role === role);
    if (status !== "all") {
      items = items.filter((user) => user.disabled === (status === "disabled"));
    }

    return { items, cursor: null };
  }

  return {
    fetchPage,
    // A range scan has no cheap exact total: an aggregation would have to
    // repeat the scan, and the in-page role and status filtering happens after
    // it in any case, so the number would be wrong as well as expensive.
    count: term
      ? undefined
      : () =>
          countCollection(COLLECTIONS.users, [
            ...(role !== "all" ? [where("role", "==", role)] : []),
            ...(status !== "all" ? [where("disabled", "==", status === "disabled")] : []),
          ]),
  };
}

/**
 * How many super admins can still sign in.
 *
 * The panel refuses to demote or disable the last one, and that check cannot be
 * made from the rows on screen. With the directory paged, a second super admin
 * sitting on page two is invisible to a page-one view, so counting the loaded
 * rows would either lock an account that is safe to demote or unlock the one
 * that is not. One aggregation answers it for the whole collection.
 */
export function countSuperAdmins(): Promise<number> {
  return countCollection(COLLECTIONS.users, [
    where("role", "==", "super_admin"),
    where("disabled", "==", false),
  ]);
}
