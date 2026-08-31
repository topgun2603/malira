"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

/**
 * The mark and the name, as one thing.
 *
 * Header and footer render this same component rather than each assembling a
 * mark and a wordmark of their own — which is how the footer drifted into a
 * 16px mark beside a single run of plain text while the header had the gold
 * two-line lockup. The community is the name and the service is what it does,
 * so they stack; only the scale changes between the two.
 */
export function BrandLockup({
  lang,
  size = "sm",
  className,
}: {
  lang: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const large = size === "lg";

  return (
    <>
      <div className={cn("flex items-center", large ? "gap-3.5" : "gap-2.5", className)}>
        {/* The medallion is detailed artwork — the ring carries the name and
            the monogram sits inside it — and none of that survives at 36px.
            Clicking it opens the full thing rather than leaving people to
            squint at a favicon. The name beside it keeps the home link, so
            this costs no navigation. */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={lang === "ta" ? "சின்னத்தைப் பெரிதாக்கு" : "View the logo"}
          className="focus-visible:ring-ring cursor-zoom-in rounded-full transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:outline-none"
        >
          <BrandMark className={large ? "size-14" : "size-9"} />
        </button>

        <Link href="/" className="leading-none">
          <span
            className={cn(
              "text-brand-gold block font-bold tracking-wide",
              large ? "text-2xl" : "text-lg",
              lang === "ta" && "font-tamil",
            )}
          >
            {lang === "ta" ? "படகர்" : "Badaga"}
          </span>
          <span
            className={cn(
              "block font-semibold tracking-[0.2em]",
              large ? "text-[0.82rem]" : "text-[0.68rem]",
              lang === "ta" && "font-tamil tracking-[0.12em]",
            )}
          >
            {lang === "ta" ? "திருமணம்" : "MATRIMONY"}
          </span>
        </Link>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[min(92vw,520px)] p-0">
          <DialogTitle className="sr-only">
            {lang === "ta" ? "படகர் திருமணம் சின்னம்" : "The Badaga Matrimony logo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {lang === "ta"
              ? "சின்னத்தின் பெரிய பதிப்பு."
              : "The logo at full size."}
          </DialogDescription>
          {/* On the ring's own blue, so the gold reads the way it does on the
              app icon rather than washing out against the page. */}
          <div className="flex items-center justify-center rounded-lg bg-[#001854] p-8 sm:p-12">
            <Image
              src="/brand/logo.png"
              alt={lang === "ta" ? "படகர் திருமணம்" : "Badaga Matrimony"}
              width={512}
              height={512}
              unoptimized
              className="h-auto w-full max-w-[380px]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
