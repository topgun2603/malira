"use client";

import NextImage from "next/image";
import { useRef, useState } from "react";
import { BookOpen, ExternalLink, Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { deleteArticleImage, uploadMatrimonyPhoto } from "@/lib/api/storage";
import { friendlyError } from "@/lib/firebase/errors";
import type { ArticleImage } from "@/lib/types";

/**
 * The jathagam sheet.
 *
 * One image rather than a gallery: families hand over a single sheet, and a
 * horoscope is compared rather than browsed. It goes to `matrimony/{uid}/…`
 * alongside the photographs and is stored in the private contact document, so
 * it is released on the same terms as the phone number — which matters more
 * here, because a jathagam carries a birth date, a birth time and a birth place
 * on one page.
 *
 * The mobile app writes to the same field, so a sheet uploaded on a phone shows
 * up here and the other way round.
 */
export function HoroscopeSheet({
  uid,
  value,
  onChange,
  disabled,
}: {
  uid: string;
  value: ArticleImage | null;
  onChange: (image: ArticleImage | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleFile(file: File) {
    const previous = value;
    try {
      setProgress(0);
      const uploaded = await uploadMatrimonyPhoto(file, uid, setProgress);
      onChange(uploaded);
      // Replacing: the old sheet helps nobody once a new one is up, and leaving
      // it behind means a horoscope nothing points at and nobody deleted.
      if (previous) void deleteArticleImage(previous);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-3">
      {progress !== null ? (
        <div className="flex items-center gap-3 rounded-lg border px-4 py-5">
          <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
          <Progress value={progress} className="h-1.5" />
          <span className="text-muted-foreground w-10 text-right text-xs">
            {progress}%
          </span>
        </div>
      ) : value ? (
        <div className="flex items-start gap-4 rounded-lg border p-3">
          <a
            href={value.url}
            target="_blank"
            rel="noreferrer"
            className="group relative block shrink-0"
            title="Open full size"
          >
            {/* A jathagam is unreadable at thumbnail size, so the thumbnail is
                a link to the real thing rather than the thing itself. */}
            <div className="bg-muted relative h-32 w-24 overflow-hidden rounded-md border">
              <NextImage
                src={value.url}
                alt="Horoscope"
                fill
                unoptimized
                className="object-cover"
                sizes="96px"
              />
            </div>
            <span className="bg-background/90 absolute right-1 bottom-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="size-3" />
            </span>
          </a>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
              <Lock className="mt-0.5 size-3 shrink-0" />
              Shown only after an interest is accepted, like the phone number.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onChange(null);
                  void deleteArticleImage(value);
                }}
              >
                <X className="size-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center">
          <BookOpen className="text-muted-foreground mx-auto mb-2 size-5" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Upload horoscope
          </Button>
          <p className="text-muted-foreground mt-2 text-xs">
            A photograph or scan of the jathagam sheet. One image.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

/** Read-only view, for a profile somebody else is looking at. */
export function HoroscopeView({ image }: { image: ArticleImage | null }) {
  if (!image) return null;

  return (
    <a
      href={image.url}
      target="_blank"
      rel="noreferrer"
      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="bg-muted relative h-24 w-[72px] shrink-0 overflow-hidden rounded-md border">
        <NextImage
          src={image.url}
          alt="Horoscope"
          fill
          unoptimized
          className="object-cover"
          sizes="72px"
        />
      </div>
      <span className="text-primary flex items-center gap-1.5 text-sm font-medium">
        <BookOpen className="size-4" />
        View the horoscope
        <ExternalLink className="size-3" />
      </span>
    </a>
  );
}
