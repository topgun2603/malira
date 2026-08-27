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
import { extractYouTubeId, fetchYouTubeMeta, youTubeThumbnail } from "@/lib/youtube";
import { countCollection, fetchCollectionPage } from "@/lib/api/paging";
import type { Artist, Playlist, Song } from "@/lib/types";
import type { QueryConstraint } from "firebase/firestore";

const PLAYLISTS = "playlists";
const SONGS = "songs";
const ARTISTS = "artists";

/* -------------------------------- playlists ------------------------------- */

export const DEFAULT_PLAYLISTS: Omit<Playlist, "id" | "createdAt">[] = [
  { name: "Devotional", nameTa: "பக்தி", description: "", coverUrl: null, order: 1, active: true },
  { name: "Folk", nameTa: "நாட்டுப்புறம்", description: "", coverUrl: null, order: 2, active: true },
  { name: "Film", nameTa: "திரைப்படம்", description: "", coverUrl: null, order: 3, active: true },
  { name: "Wedding", nameTa: "திருமணம்", description: "", coverUrl: null, order: 4, active: true },
  { name: "New releases", nameTa: "புதிய வெளியீடுகள்", description: "", coverUrl: null, order: 5, active: true },
];

export async function listPlaylists(): Promise<Playlist[]> {
  const snapshot = await getDocs(
    query(collection(db, PLAYLISTS), orderBy("order", "asc")),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Playlist);
}

export async function createPlaylist(
  input: Pick<Playlist, "name" | "nameTa" | "description" | "order" | "active">,
): Promise<string> {
  const ref = await addDoc(collection(db, PLAYLISTS), {
    ...input,
    coverUrl: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlaylist(
  id: string,
  input: Partial<Playlist>,
): Promise<void> {
  await updateDoc(doc(db, PLAYLISTS, id), input);
}

export async function deletePlaylist(id: string): Promise<void> {
  await deleteDoc(doc(db, PLAYLISTS, id));
}

export async function seedPlaylists(): Promise<number> {
  const existing = await listPlaylists();
  if (existing.length > 0) return 0;
  await Promise.all(
    DEFAULT_PLAYLISTS.map((playlist) =>
      addDoc(collection(db, PLAYLISTS), { ...playlist, createdAt: serverTimestamp() }),
    ),
  );
  return DEFAULT_PLAYLISTS.length;
}

/* --------------------------------- artists -------------------------------- */

export async function listArtists(): Promise<Artist[]> {
  const snapshot = await getDocs(
    query(collection(db, ARTISTS), orderBy("name", "asc")),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Artist);
}

export async function createArtist(
  input: Pick<Artist, "name" | "nameTa" | "bio" | "bioTa">,
): Promise<string> {
  const ref = await addDoc(collection(db, ARTISTS), {
    ...input,
    photoUrl: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateArtist(id: string, input: Partial<Artist>): Promise<void> {
  await updateDoc(doc(db, ARTISTS, id), input);
}

export async function deleteArtist(id: string): Promise<void> {
  await deleteDoc(doc(db, ARTISTS, id));
}

/* ---------------------------------- songs --------------------------------- */

export async function listSongs(playlistId?: string): Promise<Song[]> {
  const constraints = playlistId
    ? [where("playlistIds", "array-contains", playlistId), orderBy("order", "asc")]
    : [orderBy("createdAt", "desc")];
  const snapshot = await getDocs(query(collection(db, SONGS), ...constraints));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Song);
}

export interface SongDraft {
  url: string;
  title: string;
  titleTa: string;
  artistId: string | null;
  artistName: string;
  playlistIds: string[];
  isNewRelease: boolean;
}

/**
 * Resolves a pasted YouTube link into a song.
 *
 * Title and thumbnail come from oEmbed, so there is no Data API key to manage
 * and no daily quota to run out of. Only the video id is stored — every URL
 * shape an editor might paste normalises to the same thing.
 */
export async function resolveYouTube(url: string) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const meta = await fetchYouTubeMeta(id);
  return {
    youtubeId: id,
    title: meta?.title ?? "",
    artistName: meta?.authorName ?? "",
    thumbnailUrl: meta?.thumbnailUrl ?? youTubeThumbnail(id),
  };
}

export async function createSong(
  draft: SongDraft,
  actor: { uid: string },
): Promise<string> {
  const id = extractYouTubeId(draft.url);
  if (!id) throw new Error("That is not a YouTube link we recognise.");

  const existing = await getDocs(
    query(collection(db, SONGS), where("youtubeId", "==", id)),
  );
  if (!existing.empty) {
    throw new Error("That video is already in the library.");
  }

  const ref = await addDoc(collection(db, SONGS), {
    title: draft.title,
    titleTa: draft.titleTa,
    youtubeId: id,
    thumbnailUrl: youTubeThumbnail(id),
    artistId: draft.artistId,
    artistName: draft.artistName,
    playlistIds: draft.playlistIds,
    isNewRelease: draft.isNewRelease,
    order: Date.parse(new Date().toISOString()),
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSong(id: string, input: Partial<Song>): Promise<void> {
  await updateDoc(doc(db, SONGS, id), input);
}

export async function deleteSong(id: string): Promise<void> {
  await deleteDoc(doc(db, SONGS, id));
}


/* -------------------------------------------------------------------------- */
/*  Paged                                                                      */
/* -------------------------------------------------------------------------- */

export interface SongFilters {
  playlistId?: string | "all";
  artistId?: string | "all";
  newReleasesOnly?: boolean;
}

/**
 * One page of songs.
 *
 * This is the list that grows without limit — every song ever added stays
 * added — so the filters are real `where` clauses and the page is a Firestore
 * page, not a slice of everything.
 *
 * Ordering follows the question being asked. Inside a playlist the running
 * order is what matters, because that is the sequence a listener hears; across
 * the whole library the newest additions are what a desk is looking for.
 */
export function songsPage({
  playlistId = "all",
  artistId = "all",
  newReleasesOnly = false,
}: SongFilters = {}) {
  const inPlaylist = playlistId !== "all";

  const filters: QueryConstraint[] = [];
  if (inPlaylist) filters.push(where("playlistIds", "array-contains", playlistId));
  if (artistId !== "all") filters.push(where("artistId", "==", artistId));
  if (newReleasesOnly) filters.push(where("isNewRelease", "==", true));

  const constraints = [
    ...filters,
    inPlaylist ? orderBy("order", "asc") : orderBy("createdAt", "desc"),
  ];

  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(
        SONGS,
        constraints,
        (id, data) => ({ id, ...data }) as Song,
        after,
        pageSize,
      ),
    // The equality filters alone — an aggregation has no use for the ordering.
    count: () => countCollection(SONGS, filters),
  };
}

export interface PlaylistFilters {
  active?: "all" | "active" | "inactive";
}

export function playlistsPage({ active = "all" }: PlaylistFilters = {}) {
  const filters: QueryConstraint[] =
    active === "all" ? [] : [where("active", "==", active === "active")];

  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(
        PLAYLISTS,
        [...filters, orderBy("order", "asc")],
        (id, data) => ({ id, ...data }) as Playlist,
        after,
        pageSize,
      ),
    count: () => countCollection(PLAYLISTS, filters),
  };
}

export function artistsPage() {
  return {
    fetchPage: (after: Parameters<typeof fetchCollectionPage>[3], pageSize: number) =>
      fetchCollectionPage(
        ARTISTS,
        [orderBy("name", "asc")],
        (id, data) => ({ id, ...data }) as Artist,
        after,
        pageSize,
      ),
    count: () => countCollection(ARTISTS),
  };
}

/**
 * How many songs sit in each of the given playlists, and against each artist.
 *
 * The counts used to come from filtering the whole song list in the browser,
 * which stopped being true the moment songs were paged: a page of twenty-five
 * songs would have reported "3 songs" for a playlist holding two hundred. One
 * aggregation per row is a handful of cheap queries and an honest number.
 */
export async function countSongsPerPlaylist(ids: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    ids.map((id) =>
      countCollection(SONGS, [where("playlistIds", "array-contains", id)]),
    ),
  );
  return Object.fromEntries(ids.map((id, index) => [id, counts[index]]));
}

export async function countSongsPerArtist(ids: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    ids.map((id) => countCollection(SONGS, [where("artistId", "==", id)])),
  );
  return Object.fromEntries(ids.map((id, index) => [id, counts[index]]));
}
