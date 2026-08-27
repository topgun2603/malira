"use client";

import { useState } from "react";
import NextImage from "next/image";
import { ListMusic, Loader2, Music, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import {
  ArtistsTable,
  PlaylistsTable,
  SongsTable,
  type SongFilterState,
} from "@/components/music/music-tables";
import {
  useArtists,
  useCreateArtist,
  useCreatePlaylist,
  useCreateSong,
  useDeleteArtist,
  useDeletePlaylist,
  useDeleteSong,
  usePagedArtists,
  usePagedPlaylists,
  usePagedSongs,
  usePlaylists,
  useSeedPlaylists,
  useSongCounts,
  useUpdatePlaylist,
  useUpdateSong,
} from "@/hooks/use-phase2";
import { resolveYouTube } from "@/lib/api/playlists";

export default function PlaylistsPage() {
  // The unpaged lists still back the two dialogs, where you pick from every
  // playlist and every artist rather than from whichever page is on screen.
  // Both stay small by nature; the songs behind them do not, which is why the
  // three tables below are paged in Firestore.
  const { data: playlists } = usePlaylists();
  const { data: artists } = useArtists();

  const [songFilters, setSongFilters] = useState<SongFilterState>({
    playlistId: "all",
    artistId: "all",
    newReleasesOnly: false,
  });
  const [playlistActive, setPlaylistActive] =
    useState<"all" | "active" | "inactive">("all");

  const songsPage = usePagedSongs(songFilters);
  const playlistsPage = usePagedPlaylists({ active: playlistActive });
  const artistsPage = usePagedArtists();

  // Counted in Firestore for the rows actually on screen. Filtering a page of
  // songs would report the page, not the playlist.
  const playlistCounts = useSongCounts(
    "playlist",
    playlistsPage.items.map((playlist) => playlist.id),
  );
  const artistCounts = useSongCounts(
    "artist",
    artistsPage.items.map((artist) => artist.id),
  );

  const seedPlaylists = useSeedPlaylists();
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const createArtist = useCreateArtist();
  const deleteArtist = useDeleteArtist();
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();

  const [songOpen, setSongOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<{
    youtubeId: string;
    title: string;
    artistName: string;
    thumbnailUrl: string;
  } | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [songTitleTa, setSongTitleTa] = useState("");
  const [artistId, setArtistId] = useState<string>("none");
  const [playlistId, setPlaylistId] = useState<string>("none");
  const [isNewRelease, setIsNewRelease] = useState(false);

  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistNameTa, setPlaylistNameTa] = useState("");

  const [artistOpen, setArtistOpen] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [artistNameTa, setArtistNameTa] = useState("");

  async function lookUp() {
    if (!url.trim()) return;
    setResolving(true);
    const meta = await resolveYouTube(url);
    setResolving(false);
    if (!meta) {
      toast.error("That is not a YouTube link we recognise.");
      return;
    }
    setResolved(meta);
    setSongTitle(meta.title);
  }

  function addSong() {
    if (!resolved) return toast.error("Look up the link first.");
    if (!songTitle.trim()) return toast.error("The song needs a title.");

    createSong.mutate(
      {
        url,
        title: songTitle,
        titleTa: songTitleTa,
        artistId: artistId === "none" ? null : artistId,
        artistName:
          artistId === "none"
            ? resolved.artistName
            : ((artists ?? []).find((a) => a.id === artistId)?.name ?? ""),
        playlistIds: playlistId === "none" ? [] : [playlistId],
        isNewRelease,
      },
      {
        onSuccess: () => {
          setSongOpen(false);
          setUrl("");
          setResolved(null);
          setSongTitle("");
          setSongTitleTa("");
          setIsNewRelease(false);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Songs & playlists"
        description="Playback is the official YouTube player only. No background play, no downloads."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPlaylistOpen(true)}>
              <Plus className="size-4" />
              Playlist
            </Button>
            <Button onClick={() => setSongOpen(true)}>
              <Plus className="size-4" />
              Add song
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="songs">
        <TabsList>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
        </TabsList>

        {/* --------------------------------- songs -------------------------- */}
        <TabsContent value="songs" className="mt-4">
          {songsPage.isLoading ? (
            <TableSkeleton rows={5} />
          ) : songsPage.items.length === 0 ? (
            <EmptyState
              icon={Music}
              title={
                songFilters.playlistId !== "all" ||
                songFilters.artistId !== "all" ||
                songFilters.newReleasesOnly
                  ? "Nothing matches"
                  : "No songs yet"
              }
              description={
                songFilters.playlistId !== "all" ||
                songFilters.artistId !== "all" ||
                songFilters.newReleasesOnly
                  ? "No song in the library matches the current filters."
                  : "Paste a YouTube link and the title and thumbnail are fetched for you."
              }
              action={
                songFilters.playlistId === "all" &&
                songFilters.artistId === "all" &&
                !songFilters.newReleasesOnly && (
                  <Button onClick={() => setSongOpen(true)}>Add the first song</Button>
                )
              }
            />
          ) : (
            <SongsTable
              page={songsPage}
              filters={songFilters}
              onFiltersChange={setSongFilters}
              playlists={playlists ?? []}
              artists={artists ?? []}
              onToggleNewRelease={(song, checked) =>
                updateSong.mutate({ id: song.id, input: { isNewRelease: checked } })
              }
              onDelete={(song) => deleteSong.mutate(song.id)}
            />
          )}
        </TabsContent>

        {/* ------------------------------ playlists ------------------------- */}
        <TabsContent value="playlists" className="mt-4">
          {playlistsPage.isLoading ? (
            <TableSkeleton rows={5} />
          ) : playlistsPage.items.length === 0 ? (
            <EmptyState
              icon={ListMusic}
              title={playlistActive === "all" ? "No playlists yet" : "Nothing matches"}
              description={
                playlistActive === "all"
                  ? "Start with Devotional, Folk, Film, Wedding and New releases."
                  : "No playlist has that status."
              }
              action={
                playlistActive === "all" && (
                  <Button
                    onClick={() => seedPlaylists.mutate(undefined)}
                    disabled={seedPlaylists.isPending}
                  >
                    Add the default playlists
                  </Button>
                )
              }
            />
          ) : (
            <PlaylistsTable
              page={playlistsPage}
              active={playlistActive}
              onActiveChange={setPlaylistActive}
              counts={playlistCounts.data}
              onToggleActive={(playlist, checked) =>
                updatePlaylist.mutate({ id: playlist.id, input: { active: checked } })
              }
              onDelete={(playlist) => deletePlaylist.mutate(playlist.id)}
            />
          )}
        </TabsContent>

        {/* ------------------------------- artists -------------------------- */}
        <TabsContent value="artists" className="mt-4 space-y-3">
          <Button variant="outline" size="sm" onClick={() => setArtistOpen(true)}>
            <Plus className="size-4" />
            Add artist
          </Button>

          {artistsPage.isLoading ? (
            <TableSkeleton rows={4} />
          ) : artistsPage.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No artist pages yet"
              description="An artist page lists every song credited to them."
            />
          ) : (
            <ArtistsTable
              page={artistsPage}
              counts={artistCounts.data}
              onDelete={(artist) => deleteArtist.mutate(artist.id)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ------------------------------ add song ---------------------------- */}
      <Dialog open={songOpen} onOpenChange={setSongOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a song</DialogTitle>
            <DialogDescription>
              Paste the YouTube link. The title, artist and thumbnail come back
              automatically — no API key, no quota.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">YouTube link</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  value={url}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(event) => setUrl(event.target.value)}
                />
                <Button variant="outline" onClick={lookUp} disabled={resolving}>
                  {resolving && <Loader2 className="size-4 animate-spin" />}
                  Look up
                </Button>
              </div>
            </div>

            {resolved && (
              <>
                <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-2">
                  <div className="bg-muted relative h-12 w-20 shrink-0 overflow-hidden rounded">
                    <NextImage
                      src={resolved.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                    {resolved.artistName}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="songTitle">Title</Label>
                  <Input
                    id="songTitle"
                    value={songTitle}
                    onChange={(event) => setSongTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="songTitleTa">தலைப்பு</Label>
                  <Input
                    id="songTitleTa"
                    lang="ta"
                    className="font-tamil"
                    value={songTitleTa}
                    onChange={(event) => setSongTitleTa(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="artist">Artist</Label>
                    <Select value={artistId} onValueChange={setArtistId}>
                      <SelectTrigger id="artist" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">From YouTube</SelectItem>
                        {(artists ?? []).map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playlist">Playlist</Label>
                    <Select value={playlistId} onValueChange={setPlaylistId}>
                      <SelectTrigger id="playlist" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None yet</SelectItem>
                        {(playlists ?? []).map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="newRelease">Mark as a new release</Label>
                    <p className="text-muted-foreground text-xs">
                      New releases can trigger a push notification.
                    </p>
                  </div>
                  <Switch
                    id="newRelease"
                    checked={isNewRelease}
                    onCheckedChange={setIsNewRelease}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSongOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addSong} disabled={!resolved || createSong.isPending}>
              {createSong.isPending && <Loader2 className="size-4 animate-spin" />}
              Add song
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------- add playlist -------------------------- */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlistName">Name</Label>
              <Input
                id="playlistName"
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlistNameTa">பெயர்</Label>
              <Input
                id="playlistNameTa"
                lang="ta"
                className="font-tamil"
                value={playlistNameTa}
                onChange={(event) => setPlaylistNameTa(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlaylistOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!playlistName.trim()) return toast.error("Give the playlist a name.");
                createPlaylist.mutate(
                  {
                    name: playlistName,
                    nameTa: playlistNameTa,
                    description: "",
                    order: (playlists?.length ?? 0) + 1,
                    active: true,
                  },
                  {
                    onSuccess: () => {
                      setPlaylistOpen(false);
                      setPlaylistName("");
                      setPlaylistNameTa("");
                    },
                  },
                );
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------- add artist --------------------------- */}
      <Dialog open={artistOpen} onOpenChange={setArtistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New artist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artistName">Name</Label>
              <Input
                id="artistName"
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artistNameTa">பெயர்</Label>
              <Input
                id="artistNameTa"
                lang="ta"
                className="font-tamil"
                value={artistNameTa}
                onChange={(event) => setArtistNameTa(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArtistOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!artistName.trim()) return toast.error("Give the artist a name.");
                createArtist.mutate(
                  { name: artistName, nameTa: artistNameTa, bio: "", bioTa: "" },
                  {
                    onSuccess: () => {
                      setArtistOpen(false);
                      setArtistName("");
                      setArtistNameTa("");
                    },
                  },
                );
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
