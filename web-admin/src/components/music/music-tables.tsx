"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ReactTable,
} from "@tanstack/react-table";
import type { RowData } from "@tanstack/table-core";
import NextImage from "next/image";
import { useMemo, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ChevronsUpDown, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import type { ServerPage } from "@/hooks/use-server-page";
import { youTubeWatchUrl } from "@/lib/youtube";
import type { Artist, Playlist, Song } from "@/lib/types";

/**
 * Sorting only, in all three tables. Filtering and paging both happen in
 * Firestore, so a client-side filter would narrow a page that has already been
 * narrowed, and a client-side paginator would page a page.
 *
 * Sorting therefore reorders the rows on screen rather than the whole library —
 * the honest trade for not reading every song ever added to show twenty-five.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

/* -------------------------------------------------------------------------- */
/*  Shared shell                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The chrome around every table on this page: the scroll container, the
 * sortable header and the paging bar. Written once because three tables that
 * page differently would only look like a bug.
 */
function TableShell<TData extends RowData, TSelected>({
  table,
  page,
  noun,
  toolbar,
}: {
  table: ReactTable<typeof features, TData, TSelected>;
  page: ServerPage<TData>;
  noun: string;
  toolbar?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {toolbar}

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => {
                    const sortable = header.column.getCanSort?.() ?? false;
                    const sorted = header.column.getIsSorted?.();
                    return (
                      <TableHead key={header.id} className="h-10">
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            className="hover:text-foreground flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler?.()}
                          >
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 align-middle">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaginationBar
        pageIndex={page.pageIndex}
        pageSize={page.pageSize}
        setPageSize={page.setPageSize}
        hasPrev={page.hasPrev}
        hasNext={page.hasNext}
        onPrev={page.prev}
        onNext={page.next}
        total={page.total}
        pageCount={page.pageCount}
        loading={page.isFetching}
        noun={noun}
      />
    </div>
  );
}

/** A count that is still being fetched reads as pending, not as zero. */
function Count({
  counts,
  id,
  noun,
}: {
  counts: Record<string, number> | undefined;
  id: string;
  noun: string;
}) {
  const value = counts?.[id];
  return (
    <span className="text-muted-foreground text-sm whitespace-nowrap">
      {value === undefined ? "…" : `${value} ${value === 1 ? noun : `${noun}s`}`}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Songs                                                                      */
/* -------------------------------------------------------------------------- */

const songHelper = createColumnHelper<typeof features, Song>();
const NO_SONGS: Song[] = [];

export interface SongFilterState {
  playlistId: string | "all";
  artistId: string | "all";
  newReleasesOnly: boolean;
}

export function SongsTable({
  page,
  filters,
  onFiltersChange,
  playlists,
  artists,
  onToggleNewRelease,
  onDelete,
}: {
  page: ServerPage<Song>;
  filters: SongFilterState;
  onFiltersChange: (next: SongFilterState) => void;
  playlists: Playlist[];
  artists: Artist[];
  onToggleNewRelease: (song: Song, value: boolean) => void;
  onDelete: (song: Song) => void;
}) {
  const songs = page.items;

  const columns = useMemo(
    () =>
      songHelper.columns([
        songHelper.accessor("title", {
          header: "Song",
          cell: ({ row }) => {
            const song = row.original;
            return (
              <div className="flex items-center gap-3">
                <div className="bg-muted relative h-12 w-20 shrink-0 overflow-hidden rounded">
                  <NextImage
                    src={song.thumbnailUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="min-w-0 max-w-72">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{song.title}</p>
                    {song.isNewRelease && (
                      <Badge className="font-normal">
                        <Sparkles className="size-3" />
                        New
                      </Badge>
                    )}
                  </div>
                  {song.titleTa && (
                    <p className="text-muted-foreground font-tamil truncate text-sm">
                      {song.titleTa}
                    </p>
                  )}
                </div>
              </div>
            );
          },
        }),

        songHelper.accessor("artistName", {
          header: "Artist",
          cell: ({ row }) => (
            <span className="text-sm">
              {row.original.artistName || (
                <span className="text-muted-foreground">Unknown artist</span>
              )}
            </span>
          ),
        }),

        songHelper.display({
          id: "playlists",
          header: "Playlists",
          cell: ({ row }) => {
            const ids = row.original.playlistIds;
            if (ids.length === 0) {
              return <span className="text-muted-foreground text-xs">Unfiled</span>;
            }
            return (
              <div className="flex max-w-56 flex-wrap gap-1">
                {ids.map((id) => (
                  <Badge key={id} variant="secondary" className="font-normal">
                    {playlists.find((playlist) => playlist.id === id)?.name ?? "—"}
                  </Badge>
                ))}
              </div>
            );
          },
        }),

        songHelper.accessor((song) => song.createdAt?.toMillis() ?? 0, {
          id: "createdAt",
          header: "Added",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {row.original.createdAt
                ? formatDistanceToNow(row.original.createdAt.toDate(), {
                    addSuffix: true,
                  })
                : "—"}
            </span>
          ),
        }),

        songHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const song = row.original;
            return (
              <div className="flex items-center justify-end gap-2">
                <Label
                  htmlFor={`new-${song.id}`}
                  className="text-muted-foreground text-xs whitespace-nowrap"
                >
                  New release
                </Label>
                <Switch
                  id={`new-${song.id}`}
                  checked={song.isNewRelease}
                  onCheckedChange={(checked) => onToggleNewRelease(song, checked)}
                />
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={youTubeWatchUrl(song.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  aria-label={`Remove ${song.title}`}
                  onClick={() => onDelete(song)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            );
          },
        }),
      ]),
    [playlists, onToggleNewRelease, onDelete],
  );

  const table = useTable(
    { features, columns, data: songs.length > 0 ? songs : NO_SONGS },
    (state) => ({ sorting: state.sorting }),
  );

  return (
    <TableShell
      table={table}
      page={page}
      noun="song"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={filters.playlistId}
            onValueChange={(value) => onFiltersChange({ ...filters, playlistId: value })}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any playlist</SelectItem>
              {playlists.map((playlist) => (
                <SelectItem key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.artistId}
            onValueChange={(value) => onFiltersChange({ ...filters, artistId: value })}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any artist</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="new-releases-only"
              checked={filters.newReleasesOnly}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, newReleasesOnly: checked })
              }
            />
            <Label htmlFor="new-releases-only" className="text-sm">
              New releases only
            </Label>
          </div>

          {/* Inside a playlist the running order is the sequence a listener
              hears, so that is what the page walks. Everywhere else the newest
              additions come first. */}
          <p className="text-muted-foreground text-xs sm:ml-auto">
            {filters.playlistId === "all" ? "Newest first" : "Playlist order"}
          </p>
        </div>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Playlists                                                                  */
/* -------------------------------------------------------------------------- */

const playlistHelper = createColumnHelper<typeof features, Playlist>();
const NO_PLAYLISTS: Playlist[] = [];

export function PlaylistsTable({
  page,
  active,
  onActiveChange,
  counts,
  onToggleActive,
  onDelete,
}: {
  page: ServerPage<Playlist>;
  active: "all" | "active" | "inactive";
  onActiveChange: (next: "all" | "active" | "inactive") => void;
  counts: Record<string, number> | undefined;
  onToggleActive: (playlist: Playlist, value: boolean) => void;
  onDelete: (playlist: Playlist) => void;
}) {
  const playlists = page.items;

  const columns = useMemo(
    () =>
      playlistHelper.columns([
        playlistHelper.accessor("name", {
          header: "Playlist",
          cell: ({ row }) => {
            const playlist = row.original;
            return (
              <div className="min-w-0">
                <p className="font-medium">{playlist.name}</p>
                {playlist.nameTa && (
                  <p className="text-muted-foreground font-tamil text-sm">
                    {playlist.nameTa}
                  </p>
                )}
              </div>
            );
          },
        }),

        playlistHelper.accessor("order", {
          header: "Order",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">{row.original.order}</span>
          ),
        }),

        playlistHelper.display({
          id: "songs",
          header: "Songs",
          cell: ({ row }) => (
            <Count counts={counts} id={row.original.id} noun="song" />
          ),
        }),

        playlistHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const playlist = row.original;
            return (
              <div className="flex items-center justify-end gap-2">
                <Label
                  htmlFor={`active-${playlist.id}`}
                  className="text-muted-foreground text-xs"
                >
                  Active
                </Label>
                <Switch
                  id={`active-${playlist.id}`}
                  checked={playlist.active}
                  onCheckedChange={(checked) => onToggleActive(playlist, checked)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  aria-label={`Delete ${playlist.name}`}
                  onClick={() => onDelete(playlist)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            );
          },
        }),
      ]),
    [counts, onToggleActive, onDelete],
  );

  const table = useTable(
    { features, columns, data: playlists.length > 0 ? playlists : NO_PLAYLISTS },
    (state) => ({ sorting: state.sorting }),
  );

  return (
    <TableShell
      table={table}
      page={page}
      noun="playlist"
      toolbar={
        <Select
          value={active}
          onValueChange={(value) =>
            onActiveChange(value as "all" | "active" | "inactive")
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All playlists</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Hidden</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Artists                                                                    */
/* -------------------------------------------------------------------------- */

const artistHelper = createColumnHelper<typeof features, Artist>();
const NO_ARTISTS: Artist[] = [];

export function ArtistsTable({
  page,
  counts,
  onDelete,
}: {
  page: ServerPage<Artist>;
  counts: Record<string, number> | undefined;
  onDelete: (artist: Artist) => void;
}) {
  const artists = page.items;

  const columns = useMemo(
    () =>
      artistHelper.columns([
        artistHelper.accessor("name", {
          header: "Artist",
          cell: ({ row }) => {
            const artist = row.original;
            return (
              <div className="min-w-0">
                <p className="font-medium">{artist.name}</p>
                {artist.nameTa && (
                  <p className="text-muted-foreground font-tamil text-sm">
                    {artist.nameTa}
                  </p>
                )}
              </div>
            );
          },
        }),

        artistHelper.display({
          id: "songs",
          header: "Songs",
          cell: ({ row }) => (
            <Count counts={counts} id={row.original.id} noun="song" />
          ),
        }),

        artistHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                className="size-9"
                aria-label={`Delete ${row.original.name}`}
                onClick={() => onDelete(row.original)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          ),
        }),
      ]),
    [counts, onDelete],
  );

  const table = useTable(
    { features, columns, data: artists.length > 0 ? artists : NO_ARTISTS },
    (state) => ({ sorting: state.sorting }),
  );

  return <TableShell table={table} page={page} noun="artist" />;
}
