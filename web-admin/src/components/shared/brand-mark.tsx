import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The Badaga Matrimony mark.
 *
 * The supplied medallion, cropped square to its gold ring and cut out of the
 * cream sheet it arrived on, so it can sit on a dark sidebar, a light page or
 * the reader header without carrying a pale rectangle with it. The same file
 * the Flutter launcher icons are generated from, so the thing in the browser
 * tab, on the home screen and at the top of the page are one mark rather than
 * three near-misses.
 *
 * `unoptimized` because the artwork is already a fixed 512px square and the
 * optimiser has nothing to do but re-encode a gradient that does not survive
 * it well.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Badaga Matrimony"
      width={512}
      height={512}
      unoptimized
      priority
      className={cn("size-9 shrink-0", className)}
    />
  );
}
