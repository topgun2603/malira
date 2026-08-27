"use client";

import NextImage from "next/image";
import { useState } from "react";
import { Disc3, Music, Play, Sparkles, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion/primitives";
import { HeroBand, HeroStat } from "@/components/reader/hero-band";
import { useLanguage } from "@/components/reader/language";
import { AdSlot } from "@/components/reader/ad-slot";
import { useArtists, usePlaylists, useSongs } from "@/hooks/use-phase2";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Drop a file here and the hero picks it up; see public/songs/IMAGE-PROMPTS.md */
const HERO_IMAGE = "/songs/hero.png";

function Player({
  song,
  playing,
  onPlay,
  onClose,
  priority,
}: {
  song: Song;
  playing: boolean;
  onPlay: () => void;
  onClose: () => void;
  priority?: boolean;
}) {
  return (
    <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
      {playing ? (
        <>
          {/* Official embed only: no background play, no download — the same
              constraint the Android app is bound to. */}
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${song.youtubeId}?autoplay=1`}
            title={song.title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 z-10 size-7"
            aria-label="Close player"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </>
      ) : (
        <button
          type="button"
          className="group absolute inset-0"
          onClick={onPlay}
          aria-label={`Play ${song.title}`}
        >
          <NextImage
            src={song.thumbnailUrl}
            alt=""
            fill
            unoptimized
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 480px"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
            <span className="bg-background/95 flex size-14 items-center justify-center rounded-full shadow-lg">
              <Play className="text-foreground ml-0.5 size-6 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export default function ReaderSongsPage() {
  const { lang, pick } = useLanguage();
  const { data: playlists } = usePlaylists();
  const { data: artists } = useArtists();
  const [playlistId, setPlaylistId] = useState<string>("all");
  const { data: songs, isLoading } = useSongs(
    playlistId === "all" ? undefined : playlistId,
  );
  const { data: everySong } = useSongs();
  const [playing, setPlaying] = useState<string | null>(null);

  const activePlaylists = (playlists ?? []).filter((playlist) => playlist.active);
  const list = songs ?? [];
  const newReleases = (everySong ?? []).filter((song) => song.isNewRelease);
  const featured = newReleases[0] ?? (everySong ?? [])[0];

  return (
    <>
      <HeroBand
        image={HERO_IMAGE}
        eyebrow={lang === "ta" ? "பாடல்கள்" : "Songs & videos"}
        title={
          lang === "ta" ? (
            <span className="font-tamil">
              மலைநாட்டின்
              <br />
              இசை ஒரே இடத்தில்
            </span>
          ) : (
            <>
              The music of
              <br />
              these hills
            </>
          )
        }
        lead={
          lang === "ta"
            ? "பக்தி, நாட்டுப்புறம், திரைப்படம், திருமணப் பாடல்கள் — அனைத்தும் அதிகாரப்பூர்வ YouTube பிளேயரில்."
            : "Devotional, folk, film and wedding music, collected in one place and played through the official YouTube player."
        }
        aside={
          (everySong ?? []).length > 0 ? (
            <div className="flex gap-3">
              <HeroStat
                value={String((everySong ?? []).length)}
                label={lang === "ta" ? "பாடல்கள்" : "Tracks"}
              />
              <HeroStat
                value={String(activePlaylists.length)}
                label={lang === "ta" ? "பட்டியல்கள்" : "Playlists"}
              />
            </div>
          ) : undefined
        }
      />

      {/* ------------------------------ featured -------------------------- */}
      {featured && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <FadeIn className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <Player
              song={featured}
              playing={playing === featured.youtubeId}
              onPlay={() => setPlaying(featured.youtubeId)}
              onClose={() => setPlaying(null)}
              priority
            />

            <div>
              {featured.isNewRelease && (
                <Badge className="mb-3 gap-1 font-normal">
                  <Sparkles className="size-3" />
                  {lang === "ta" ? "புதிய வெளியீடு" : "New release"}
                </Badge>
              )}
              <h2 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                {pick(featured.title, featured.titleTa)}
              </h2>
              {featured.artistName && (
                <p className="text-muted-foreground mt-2 text-lg">
                  {featured.artistName}
                </p>
              )}
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {lang === "ta"
                  ? "அதிகாரப்பூர்வ பிளேயரில் இயங்குகிறது — பார்வைகள் பதிவேற்றியவருக்கே செல்கின்றன."
                  : "Played through the official player, so views and any revenue stay with the uploader."}
              </p>
            </div>
          </FadeIn>
        </section>
      )}

      {/* ---------------------------- playlist rail ----------------------- */}
      <nav className="bg-background/85 sticky top-[6.6rem] z-30 border-y backdrop-blur md:top-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="scrollbar-none flex gap-1 overflow-x-auto py-2">
            {[{ id: "all", name: "All", nameTa: "அனைத்தும்" }, ...activePlaylists].map(
              (playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => setPlaylistId(playlist.id)}
                  aria-current={playlistId === playlist.id ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                    lang === "ta" && "font-tamil",
                    playlistId === playlist.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {pick(playlist.name, playlist.nameTa)}
                </button>
              ),
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Music}
            title={lang === "ta" ? "பாடல்கள் இல்லை" : "Nothing here yet"}
            description={
              lang === "ta"
                ? "இந்தப் பட்டியலில் இன்னும் பாடல்கள் சேர்க்கப்படவில்லை."
                : "No songs have been added to this playlist yet."
            }
          />
        ) : (
          <>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                {playlistId === "all"
                  ? lang === "ta"
                    ? "அனைத்துப் பாடல்களும்"
                    : "Every track"
                  : pick(
                      activePlaylists.find((p) => p.id === playlistId)?.name ?? "",
                      activePlaylists.find((p) => p.id === playlistId)?.nameTa ?? "",
                    )}
              </h2>
              <span className="text-muted-foreground text-sm">
                {list.length} {list.length === 1 ? "track" : "tracks"}
              </span>
            </div>

            <StaggerList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((song) => (
                <StaggerItem key={song.id}>
                  <div className="bg-card overflow-hidden rounded-xl border">
                    <Player
                      song={song}
                      playing={playing === song.youtubeId}
                      onPlay={() => setPlaying(song.youtubeId)}
                      onClose={() => setPlaying(null)}
                    />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm leading-snug font-medium">
                          {pick(song.title, song.titleTa)}
                        </p>
                        {song.isNewRelease && (
                          <Badge className="shrink-0 gap-1 font-normal">
                            <Sparkles className="size-3" />
                            {lang === "ta" ? "புதியது" : "New"}
                          </Badge>
                        )}
                      </div>
                      {song.artistName && (
                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          {song.artistName}
                        </p>
                      )}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>

            <AdSlot placement="article_end" className="mt-10" />
          </>
        )}

        {/* ------------------------------ artists -------------------------- */}
        {(artists ?? []).length > 0 && (
          <section className="mt-14 border-t pt-10">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Users className="text-primary size-5" />
              {lang === "ta" ? "கலைஞர்கள்" : "Artists"}
            </h2>
            <div className="flex flex-wrap gap-3">
              {(artists ?? []).map((artist) => {
                const count = (everySong ?? []).filter(
                  (song) => song.artistId === artist.id,
                ).length;
                return (
                  <div
                    key={artist.id}
                    className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3"
                  >
                    <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                      <Disc3 className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {pick(artist.name, artist.nameTa)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {count} {count === 1 ? "track" : "tracks"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
