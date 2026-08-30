import { cn } from "@/lib/utils";

/**
 * The RK Matrimony mark: a saffron rule, the initials, a cream rule.
 *
 * The same drawing as `app/icon.svg`, `app/apple-icon.tsx` and the Flutter
 * launcher icon, so the thing in the browser tab, on the home screen and at the
 * top of the page are recognisably one mark rather than three near-misses. It
 * replaced a lucide `Mountain` glyph, which was a stock icon several other apps
 * on the same phone also use.
 *
 * Two letters where there was one: at the single-letter height the pair ran
 * past the ends of the rules and the nameplate stopped reading as a frame, so
 * the initials are shorter and the rules a little wider.
 *
 * The tile is drawn here rather than by the caller because the rules are
 * positioned against the tile's edges; a mark floated on somebody else's
 * background loses the proportions that make it legible small.
 */
export function RkMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-9 rounded-lg", className)}
      role="img"
      aria-label="RK Matrimony"
    >
      <defs>
        <linearGradient id="rk-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5E1E3B" />
          <stop offset="1" stopColor="#9C3464" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#rk-mark)" />
      {/* Equal weights: unequal rules read as one rule and a smudge when small. */}
      <rect x="5.1" y="7.1" width="21.8" height="1.6" rx="0.8" fill="#DD872B" />
      <rect x="5.1" y="23.3" width="21.8" height="1.6" rx="0.8" fill="#FAF8F2" />
      {/* Stroked paths rather than text: a favicon cannot depend on a font
          being available on the machine rendering it. */}
      <g
        fill="none"
        stroke="#FAF8F2"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8.6 21V11h3.6a2.3 2.3 0 0 1 0 4.6H8.6m2.7 0L15.2 21" />
        <path d="M18 11v10M24 11l-5.8 5.3M20.2 14.4 24.4 21" />
      </g>
    </svg>
  );
}
