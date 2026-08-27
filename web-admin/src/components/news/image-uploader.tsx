"use client";

import { ImagePlus, Loader2, Star, X } from "lucide-react";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  MAX_ARTICLE_IMAGES,
  deleteArticleImage,
  uploadArticleImage,
} from "@/lib/api/storage";
import { friendlyError } from "@/lib/firebase/errors";
import type { ArticleImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: ArticleImage[];
  onChange: (images: ArticleImage[]) => void;
  articleKey: string;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, articleKey, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const remaining = MAX_ARTICLE_IMAGES - value.length;

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    if (list.length > remaining) {
      toast.error(
        `Only ${MAX_ARTICLE_IMAGES} images per article. Room for ${remaining} more.`,
      );
      return;
    }

    const uploaded: ArticleImage[] = [];
    for (const file of list) {
      try {
        setProgress(0);
        uploaded.push(await uploadArticleImage(file, articleKey, setProgress));
      } catch (error) {
        toast.error(friendlyError(error));
      }
    }
    setProgress(null);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  }

  async function removeAt(index: number) {
    const image = value[index];
    onChange(value.filter((_, i) => i !== index));
    await deleteArticleImage(image);
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...value];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  }

  function setCaption(index: number, caption: string) {
    onChange(value.map((image, i) => (i === index ? { ...image, caption } : image)));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled && remaining > 0) void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
          (disabled || remaining === 0) && "opacity-60",
        )}
      >
        <ImagePlus className="text-muted-foreground mx-auto mb-2 size-5" />
        <p className="text-sm font-medium">Drop images here, or</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={disabled || remaining === 0}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          {remaining > 0
            ? `${remaining} of ${MAX_ARTICLE_IMAGES} slots left. Resized to 1600px WebP before upload.`
            : `Maximum of ${MAX_ARTICLE_IMAGES} images reached.`}
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
        <ul className="grid gap-3 sm:grid-cols-2">
          {value.map((image, index) => (
            <li key={image.path} className="bg-card overflow-hidden rounded-lg border">
              <div className="bg-muted relative aspect-video">
                <NextImage
                  src={image.url}
                  alt={image.caption || "Article image"}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
                {index === 0 && (
                  <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
                    Lead image
                  </span>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {index !== 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="size-7"
                      aria-label="Make lead image"
                      onClick={() => makePrimary(index)}
                    >
                      <Star className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="size-7"
                    aria-label="Remove image"
                    onClick={() => void removeAt(index)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <Input
                  value={image.caption ?? ""}
                  placeholder="Caption (optional)"
                  className="h-8 text-xs"
                  onChange={(event) => setCaption(index, event.target.value)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
