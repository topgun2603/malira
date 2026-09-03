"use client";

import NextImage from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  deleteArticleImage,
  uploadMatrimonyPhoto,
  uploadVendorPhoto,
} from "@/lib/api/storage";
import { friendlyError } from "@/lib/firebase/errors";
import type { ArticleImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;

/**
 * Photo picker for a matrimony profile.
 *
 * Uploads go to `matrimony/{uid}/…` rather than the article bucket, which is
 * world-readable. The Storage rule there requires a signed-in caller and only
 * lets the owner write.
 */
export function MatrimonyPhotos({
  uid,
  value,
  onChange,
  disabled,
  destination = "matrimony",
}: {
  uid: string;
  value: ArticleImage[];
  onChange: (photos: ArticleImage[]) => void;
  disabled?: boolean;
  /**
   * Which bucket path the files land in.
   *
   * Not cosmetic: the matrimony path is readable only by signed-in accounts and
   * the vendor path is readable by anyone, because a directory photograph has
   * to load for a family who has never signed in. Uploading a hall into the
   * matrimony path would produce a listing whose pictures are invisible to the
   * people it was paid for.
   */
  destination?: "matrimony" | "vendor";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const remaining = MAX_PHOTOS - value.length;

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (list.length > remaining) {
      toast.error(`Room for ${remaining} more photo${remaining === 1 ? "" : "s"}.`);
      return;
    }

    const uploaded: ArticleImage[] = [];
    for (const file of list) {
      try {
        setProgress(0);
        uploaded.push(
          destination === "vendor"
            ? await uploadVendorPhoto(file, uid, setProgress)
            : await uploadMatrimonyPhoto(file, uid, setProgress),
        );
      } catch (error) {
        toast.error(friendlyError(error));
      }
    }
    setProgress(null);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-lg border border-dashed px-4 py-5 text-center",
          (disabled || remaining === 0) && "opacity-60",
        )}
      >
        <ImagePlus className="text-muted-foreground mx-auto mb-2 size-5" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || remaining === 0}
          onClick={() => inputRef.current?.click()}
        >
          Add photos
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          {remaining > 0
            ? `${remaining} of ${MAX_PHOTOS} slots left. Use a photograph of the candidate alone.`
            : "Maximum photos reached."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {progress !== null && (
        <div className="flex items-center gap-3">
          <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
          <Progress value={progress} className="h-1.5" />
          <span className="text-muted-foreground w-10 text-right text-xs">
            {progress}%
          </span>
        </div>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((photo, index) => (
            <li key={photo.path} className="relative">
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
                <NextImage
                  src={photo.url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="120px"
                />
              </div>
              {index === 0 && (
                <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1 text-[9px]">
                  Main
                </span>
              )}
              <div className="absolute top-1 right-1 flex gap-1">
                {index !== 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-6"
                    aria-label="Make main photo"
                    onClick={() => {
                      const next = [...value];
                      const [picked] = next.splice(index, 1);
                      onChange([picked, ...next]);
                    }}
                  >
                    <Star className="size-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="size-6"
                  aria-label="Remove photo"
                  onClick={() => {
                    onChange(value.filter((_, i) => i !== index));
                    void deleteArticleImage(photo);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
