"use client";

import Link from "next/link";
import NextImage from "next/image";
import { ImageIcon, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ageFrom } from "@/lib/api/matrimony";
import {
  MARITAL_STATUS_LABELS,
  type MatrimonyProfile,
} from "@/lib/types";

/**
 * A profile in search results.
 *
 * When photos are restricted the card shows a lock rather than a blurred
 * image — there is no image URL to blur, because the restricted photos never
 * left the private subcollection.
 */
export function MatrimonyProfileCard({ profile }: { profile: MatrimonyProfile }) {
  const age = ageFrom(profile.dob);
  const photo = profile.photos[0];
  const locked = profile.hasPhotos && profile.photos.length === 0;

  return (
    <Link
      href={`/matrimony/${profile.id}`}
      className="group bg-card hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border transition-colors"
    >
      <div className="bg-muted text-muted-foreground relative aspect-[4/3]">
        {photo ? (
          <NextImage
            src={photo.url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            {locked ? (
              <>
                <Lock className="size-5" />
                <span className="px-4 text-center text-[11px] leading-tight">
                  Photo shared after an accepted interest
                </span>
              </>
            ) : (
              <ImageIcon className="size-6" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="group-hover:text-primary font-medium">
          {profile.name}
          {age !== null && (
            <span className="text-muted-foreground font-normal"> · {age}</span>
          )}
        </p>

        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
          {[profile.education, profile.occupation].filter(Boolean).join(" · ") ||
            "Details on the profile"}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.hometown && (
            <Badge variant="secondary" className="font-normal">
              {profile.hometown}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">
            {MARITAL_STATUS_LABELS[profile.maritalStatus]}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
