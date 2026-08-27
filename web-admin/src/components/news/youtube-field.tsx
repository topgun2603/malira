"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Loader2, Video } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  extractYouTubeId,
  fetchYouTubeMeta,
  youTubeThumbnail,
  youTubeWatchUrl,
} from "@/lib/youtube";

/**
 * Editors paste whatever YouTube gave them: a share link, a Shorts URL, a full
 * watch URL with tracking params. We normalise to the canonical watch URL so
 * the app only ever has one shape to handle.
 */
export function YouTubeField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [raw, setRaw] = useState(value ?? "");
  const id = extractYouTubeId(raw);

  const { data: meta, isFetching } = useQuery({
    queryKey: ["youtube-meta", id],
    queryFn: () => fetchYouTubeMeta(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });

  function handleInput(next: string) {
    setRaw(next);
    const nextId = extractYouTubeId(next);
    onChange(nextId ? youTubeWatchUrl(nextId) : null);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Video className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={raw}
          placeholder="Paste a YouTube link (optional)"
          className="pl-9"
          onChange={(event) => handleInput(event.target.value)}
        />
      </div>

      {raw && !id && (
        <p className="text-destructive text-xs">
          That is not a YouTube link we recognise.
        </p>
      )}

      {id && (
        <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-2">
          <div className="bg-muted relative h-12 w-20 shrink-0 overflow-hidden rounded">
            <NextImage
              src={youTubeThumbnail(id)}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0 flex-1">
            {isFetching ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3 animate-spin" />
                Fetching video details...
              </span>
            ) : (
              <>
                <p className="truncate text-sm font-medium">
                  {meta?.title || "Video linked"}
                </p>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CircleCheck className="text-status-published size-3" />
                  Will play in the in-app YouTube player
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
