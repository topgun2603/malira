"use client";

import NextImage from "next/image";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ad } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language";

/**
 * The visual for one ad, in whichever format it was booked.
 *
 * Every format carries a visible "Advertisement" label. That is not decoration:
 * an ad styled exactly like a story is the fastest way to lose a community
 * paper's credibility, and several of these formats sit directly in the feed.
 *
 * Used both on the reader site and as the live preview in the ad creator, so
 * what the desk sees while booking is literally what runs.
 */

function AdLabel({ className }: { className?: string }) {
  const { lang } = useLanguage();
  return (
    <span
      className={cn(
        "text-muted-foreground text-[10px] font-medium tracking-wider uppercase",
        className,
      )}
    >
      {lang === "ta" ? "விளம்பரம்" : "Advertisement"}
    </span>
  );
}

interface Props {
  ad: Ad;
  onClick?: () => void;
  /** Preview mode renders the creative but never navigates. */
  preview?: boolean;
}

export function AdCreative({ ad, onClick, preview }: Props) {
  const { pick, langAttr } = useLanguage();

  const headline = pick(ad.headline, ad.headlineTa);
  const body = pick(ad.body, ad.bodyTa);
  const headlineLang = langAttr(ad.headline, ad.headlineTa);

  const href = preview ? undefined : ad.ctaUrl || undefined;
  const linkProps = href
    ? { href, target: "_blank" as const, rel: "noopener noreferrer sponsored" }
    : {};

  const Cta = (
    <Button
      size="sm"
      className="mt-3"
      asChild={Boolean(href)}
      onClick={preview ? undefined : onClick}
      type="button"
    >
      {href ? (
        <a {...linkProps} onClick={onClick}>
          {ad.ctaLabel || "Learn more"}
          <ExternalLink className="size-3.5" />
        </a>
      ) : (
        <span>{ad.ctaLabel || "Learn more"}</span>
      )}
    </Button>
  );

  /* ------------------------------ banner --------------------------------- */
  if (ad.format === "banner") {
    return (
      <aside className="bg-card overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between px-3 pt-2">
          <AdLabel />
          {ad.advertiser && (
            <span className="text-muted-foreground text-[10px]">{ad.advertiser}</span>
          )}
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          {ad.image && (
            <div className="bg-muted relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-56">
              <NextImage
                src={ad.image.url}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="224px"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p lang={headlineLang} className="leading-snug font-semibold">
              {headline}
            </p>
            {body && (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {body}
              </p>
            )}
          </div>
          <div className="shrink-0 sm:self-center">{Cta}</div>
        </div>
      </aside>
    );
  }

  /* ------------------------------ sidebar -------------------------------- */
  if (ad.format === "sidebar") {
    return (
      <aside className="bg-card overflow-hidden rounded-xl border">
        <div className="px-3 pt-2">
          <AdLabel />
        </div>
        {ad.image && (
          <div className="bg-muted relative mx-3 mt-2 aspect-square overflow-hidden rounded-lg">
            <NextImage
              src={ad.image.url}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="280px"
            />
          </div>
        )}
        <div className="p-3">
          <p lang={headlineLang} className="text-sm leading-snug font-semibold">
            {headline}
          </p>
          {body && (
            <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
              {body}
            </p>
          )}
          {Cta}
          {ad.advertiser && (
            <p className="text-muted-foreground mt-2 text-[10px]">
              Paid for by {ad.advertiser}
            </p>
          )}
        </div>
      </aside>
    );
  }

  /* --------------------------- inline / popup ---------------------------- */
  return (
    <aside
      className={cn(
        "bg-card overflow-hidden rounded-xl border",
        // A dashed edge marks in-feed ads apart from the story cards beside them.
        ad.format === "inline" && "border-dashed",
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <AdLabel />
        {ad.advertiser && (
          <span className="text-muted-foreground text-[10px]">{ad.advertiser}</span>
        )}
      </div>
      {ad.image && (
        <div className="bg-muted relative mx-4 mt-2 aspect-[16/9] overflow-hidden rounded-lg">
          <NextImage
            src={ad.image.url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 420px"
          />
        </div>
      )}
      <div className="p-4">
        <p lang={headlineLang} className="leading-snug font-semibold">
          {headline}
        </p>
        {body && (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
        )}
        {Cta}
      </div>
    </aside>
  );
}
