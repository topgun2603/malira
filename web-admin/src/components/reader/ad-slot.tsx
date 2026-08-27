"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdsForPlacement } from "@/hooks/use-engagement";
import { chooseAd, recordClick, recordImpression } from "@/lib/api/ads";
import type { Ad, AdPlacement } from "@/lib/types";
import { AdCreative } from "./ad-creative";
import { cn } from "@/lib/utils";

/**
 * Renders whatever ad has been booked into a slot, or nothing at all.
 *
 * An empty slot collapses completely rather than leaving a reserved grey box —
 * on a community site most slots are unsold most of the time, and a page full
 * of "your ad here" placeholders looks worse than a page with no ads.
 */
export function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  const { data: ads } = useAdsForPlacement(placement);
  const counted = useRef<string | null>(null);

  // Pick once per mount. Re-rolling on every render would make the ad flicker
  // between advertisers as the page re-renders.
  const ad = useMemo(() => chooseAd(ads ?? []), [ads]);

  useEffect(() => {
    if (!ad || counted.current === ad.id) return;
    counted.current = ad.id;
    void recordImpression(ad.id);
  }, [ad]);

  if (!ad) return null;

  return (
    <div className={className}>
      <AdCreative ad={ad} onClick={() => void recordClick(ad.id)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Popup                                                                      */
/* -------------------------------------------------------------------------- */

const POPUP_KEY = "nilgiri-news:popup-seen";

function seenRecently(ad: Ad): boolean {
  if (ad.frequency === "every_visit") return false;
  try {
    const raw = window.sessionStorage.getItem(POPUP_KEY);
    if (ad.frequency === "once_per_session" && raw === ad.id) return true;

    const stamp = window.localStorage.getItem(`${POPUP_KEY}:${ad.id}`);
    if (!stamp) return false;
    const elapsed = Date.now() - Number(stamp);
    return elapsed < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markSeen(ad: Ad) {
  try {
    window.sessionStorage.setItem(POPUP_KEY, ad.id);
    window.localStorage.setItem(`${POPUP_KEY}:${ad.id}`, String(Date.now()));
  } catch {
    // Blocked storage means the reader may see it again. Acceptable.
  }
}

/**
 * The popup ad.
 *
 * Deliberately constrained: it waits for the delay the desk configured, it is
 * capped per reader per day by default, it closes on Escape and on a click
 * outside, and the close button is a real target rather than a 10px cross in a
 * corner. A popup that traps the reader costs more in trust than it earns in
 * revenue.
 */
export function PopupAd() {
  const { data: ads } = useAdsForPlacement("popup");
  const ad = useMemo(() => chooseAd(ads ?? []), [ads]);
  const [open, setOpen] = useState(false);
  const counted = useRef(false);

  useEffect(() => {
    if (!ad || seenRecently(ad)) return;

    const timer = window.setTimeout(
      () => {
        setOpen(true);
        markSeen(ad);
        if (!counted.current) {
          counted.current = true;
          void recordImpression(ad.id);
        }
      },
      Math.max(0, ad.delaySeconds) * 1000,
    );

    return () => window.clearTimeout(timer);
  }, [ad]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!ad || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Advertisement"
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Close advertisement"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "relative w-full max-w-sm",
          "animate-in fade-in zoom-in-95 duration-200",
        )}
      >
        <Button
          variant="secondary"
          size="sm"
          className="absolute -top-11 right-0 sm:-top-12"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
          Close
        </Button>
        <AdCreative ad={ad} onClick={() => void recordClick(ad.id)} />
      </div>
    </div>
  );
}
