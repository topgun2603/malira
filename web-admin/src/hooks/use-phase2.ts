"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  archivePastEvents,
  createEvent,
  deleteEvent,
  getPublishedEvent,
  listEvents,
  listUpcomingEvents,
  setEventStatus,
  updateEvent,
  eventsPage,
  type EventDraft,
  type EventFilters,
} from "@/lib/api/events";
import {
  createArtist,
  createPlaylist,
  createSong,
  deleteArtist,
  deletePlaylist,
  deleteSong,
  artistsPage,
  countSongsPerArtist,
  countSongsPerPlaylist,
  listArtists,
  listPlaylists,
  listSongs,
  playlistsPage,
  songsPage,
  type PlaylistFilters,
  type SongFilters,
  seedPlaylists,
  updateArtist,
  updatePlaylist,
  updateSong,
  type SongDraft,
} from "@/lib/api/playlists";
import {
  deleteNotification,
  listNotifications,
  queueNotification,
  sendNotification,
  type NotificationDraft,
} from "@/lib/api/notifications";
import { getAppSettings, saveAppSettings } from "@/lib/api/settings";
import { loadAnalytics } from "@/lib/api/analytics";
import {
  listArchiveMonths,
  listPublishedPage,
  type FeedPage,
} from "@/lib/api/public-news";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";
import { useServerPage } from "@/hooks/use-server-page";
import type {
  AppSettings,
  Artist,
  EventItem,
  EventStatus,
  Playlist,
  Song,
} from "@/lib/types";

/* ================================ events ================================== */

export const eventKeys = {
  all: ["events"] as const,
  list: (filters: EventFilters) => ["events", "list", filters] as const,
  upcoming: ["events", "upcoming"] as const,
  detail: (id: string) => ["events", "detail", id] as const,
};

export function useEvents(filters: EventFilters = {}) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => listEvents(filters),
    enabled: can(profile?.role, "events.manage"),
  });
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: eventKeys.upcoming,
    queryFn: () => listUpcomingEvents(),
    staleTime: 2 * 60_000,
  });
}

export function usePublicEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ""),
    queryFn: () => getPublishedEvent(id as string),
    enabled: Boolean(id),
  });
}

function useEventActor() {
  const { firebaseUser, profile } = useAuth();
  return {
    uid: firebaseUser?.uid ?? "",
    name: profile?.displayName ?? "Badaga Matrimony",
  };
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const actor = useEventActor();
  return useMutation({
    mutationFn: ({ draft, status }: { draft: EventDraft; status: EventStatus }) =>
      createEvent(draft, status, actor),
    onSuccess: (_, { status }) => {
      toast.success(status === "published" ? "Event published." : "Event saved.");
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: EventDraft }) =>
      updateEvent(id, draft),
    onSuccess: () => {
      toast.success("Event updated.");
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      setEventStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "published"
          ? "Event is live."
          : status === "cancelled"
            ? "Event marked as cancelled."
            : "Event moved to draft.",
      );
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      toast.success("Event deleted.");
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useArchivePastEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archivePastEvents,
    onSuccess: ({ archived, rolled }) => {
      toast.success(
        archived + rolled === 0
          ? "Nothing to tidy — no finished events."
          : `Archived ${archived}, rolled ${rolled} recurring event(s) forward.`,
      );
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* =============================== playlists ================================ */

export const musicKeys = {
  playlists: ["playlists"] as const,
  artists: ["artists"] as const,
  songs: (playlistId?: string) => ["songs", playlistId ?? "all"] as const,
};

export function usePlaylists() {
  return useQuery({
    queryKey: musicKeys.playlists,
    queryFn: listPlaylists,
    staleTime: 5 * 60_000,
  });
}

export function useArtists() {
  return useQuery({
    queryKey: musicKeys.artists,
    queryFn: listArtists,
    staleTime: 5 * 60_000,
  });
}

export function useSongs(playlistId?: string) {
  return useQuery({
    queryKey: musicKeys.songs(playlistId),
    queryFn: () => listSongs(playlistId),
    staleTime: 60_000,
  });
}

function useMusicMutation<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  message: string,
  keys: readonly unknown[][],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(message);
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSeedPlaylists() {
  return useMusicMutation(seedPlaylists, "Default playlists added.", [
    musicKeys.playlists as unknown as unknown[],
  ]);
}

export function useCreatePlaylist() {
  return useMusicMutation(createPlaylist, "Playlist created.", [
    musicKeys.playlists as unknown as unknown[],
  ]);
}

export function useUpdatePlaylist() {
  return useMusicMutation(
    ({ id, input }: { id: string; input: Partial<Playlist> }) =>
      updatePlaylist(id, input),
    "Playlist updated.",
    [musicKeys.playlists as unknown as unknown[]],
  );
}

export function useDeletePlaylist() {
  return useMusicMutation(deletePlaylist, "Playlist removed.", [
    musicKeys.playlists as unknown as unknown[],
  ]);
}

export function useCreateArtist() {
  return useMusicMutation(createArtist, "Artist added.", [
    musicKeys.artists as unknown as unknown[],
  ]);
}

export function useUpdateArtist() {
  return useMusicMutation(
    ({ id, input }: { id: string; input: Partial<Playlist> }) =>
      updateArtist(id, input),
    "Artist updated.",
    [musicKeys.artists as unknown as unknown[]],
  );
}

export function useDeleteArtist() {
  return useMusicMutation(deleteArtist, "Artist removed.", [
    musicKeys.artists as unknown as unknown[],
  ]);
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (draft: SongDraft) => createSong(draft, { uid: firebaseUser?.uid ?? "" }),
    onSuccess: () => {
      toast.success("Song added.");
      queryClient.invalidateQueries({ queryKey: ["songs"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Song> }) =>
      updateSong(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["songs"] }),
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSong,
    onSuccess: () => {
      toast.success("Song removed.");
      queryClient.invalidateQueries({ queryKey: ["songs"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* ============================= notifications ============================== */

export const notificationKeys = { all: ["notifications"] as const };

export function useNotifications() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => listNotifications(),
    enabled: can(profile?.role, "notifications.send"),
  });
}

export function useQueueNotification() {
  const queryClient = useQueryClient();
  const actor = useEventActor();
  return useMutation({
    mutationFn: (draft: NotificationDraft) => queueNotification(draft, actor),
    onSuccess: () => {
      toast.success("Queued for delivery.");
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendNotification,
    onSuccess: () => {
      toast.success("Sent.");
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/** How many messages are composed and waiting. Drives the topbar bell. */
export function useQueuedNotificationCount(): number {
  const { data } = useNotifications();
  return (data ?? []).filter((message) => message.status === "queued").length;
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      toast.success("Removed from the queue.");
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* ================================ settings ================================ */

export const settingsKeys = { app: ["settings", "app"] as const };

export function useAppSettings() {
  return useQuery({
    queryKey: settingsKeys.app,
    queryFn: getAppSettings,
    staleTime: 5 * 60_000,
  });
}

export function useSaveAppSettings() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<AppSettings, "updatedAt" | "updatedBy">) =>
      saveAppSettings(input, { uid: firebaseUser?.uid ?? "" }),
    onSuccess: () => {
      toast.success("Settings saved.");
      queryClient.invalidateQueries({ queryKey: settingsKeys.app });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* =============================== analytics ================================ */

export function useAnalytics() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["analytics"],
    queryFn: loadAnalytics,
    enabled: can(profile?.role, "analytics.view"),
    staleTime: 2 * 60_000,
  });
}

/* ============================ archive & paging ============================ */

export function useArchiveMonths() {
  return useQuery({
    queryKey: ["archive", "months"],
    queryFn: listArchiveMonths,
    staleTime: 10 * 60_000,
  });
}

/**
 * The paged feed. Cursors live in the query cache, so "Load more" never
 * refetches a page it already has.
 */
export function usePagedFeed({
  categoryId = "all",
  month = null,
  pageSize = 12,
}: {
  categoryId?: string;
  month?: string | null;
  pageSize?: number;
} = {}) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ["feed", categoryId, month, pageSize],
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      listPublishedPage({
        categoryId,
        month,
        pageSize,
        after: pageParam as FeedPage["cursor"],
      }),
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Paged lists                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Server-paged events.
 *
 * useServerPage owns the cursor stack, the page size and the arithmetic behind
 * "page 2 of 9"; this only says what to fetch and how many there are.
 */
export function usePagedEvents(filters: EventFilters = {}) {
  const { profile } = useAuth();
  const page = eventsPage(filters);
  return useServerPage<EventItem>({
    key: ["events", "paged", filters],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "events.manage"),
  });
}


/* -------------------------------------------------------------------------- */
/*  Paged music                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Server-paged songs, playlists and artists.
 *
 * The filters are part of the key, so changing one starts again at page one
 * rather than showing page four of a list that no longer has four pages.
 */
export function usePagedSongs(filters: SongFilters = {}) {
  const { profile } = useAuth();
  const page = songsPage(filters);
  return useServerPage<Song>({
    key: ["songs", "paged", filters],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "playlists.manage"),
  });
}

export function usePagedPlaylists(filters: PlaylistFilters = {}) {
  const { profile } = useAuth();
  const page = playlistsPage(filters);
  return useServerPage<Playlist>({
    key: ["playlists", "paged", filters],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "playlists.manage"),
  });
}

export function usePagedArtists() {
  const { profile } = useAuth();
  const page = artistsPage();
  return useServerPage<Artist>({
    key: ["artists", "paged"],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "playlists.manage"),
  });
}

/**
 * The song count for each row on screen, counted in Firestore.
 *
 * Keyed on the ids actually shown, so paging to the next page of playlists
 * counts that page and leaves the previous one cached. One query object rather
 * than one per row keeps the render simple; the aggregations inside it run
 * concurrently.
 */
export function useSongCounts(kind: "playlist" | "artist", ids: string[]) {
  const sorted = [...ids].sort();
  return useQuery({
    queryKey: ["songs", "counts", kind, sorted],
    queryFn: () =>
      kind === "playlist" ? countSongsPerPlaylist(sorted) : countSongsPerArtist(sorted),
    enabled: sorted.length > 0,
    staleTime: 60_000,
  });
}
