import { cn } from "@/lib/utils";

/**
 * The MALIRA mark: a saffron rule, a heavy M, a cream rule.
 *
 * The same drawing as `app/icon.svg`, `app/apple-icon.tsx` and the Flutter
 * launcher icon, so the thing in the browser tab, on the home screen and at the
 * top of the page are recognisably one mark rather than three near-misses. It
 * replaced a lucide `Mountain` glyph, which was a stock icon several other apps
 * on the same phone also use.
 *
 * The tile is drawn here rather than by the caller because the rules are
 * positioned against the tile's edges; a mark floated on somebody else's
 * background loses the proportions that make it legible small.
 */
export function MaliraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-9 rounded-lg", className)}
      role="img"
      aria-label="MALIRA"
    >
      <defs>
        <linearGradient id="malira-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5E1E3B" />
          <stop offset="1" stopColor="#9C3464" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#malira-mark)" />
      {/* Equal weights: unequal rules read as one rule and a smudge when small. */}
      <rect x="6.4" y="7.1" width="19.2" height="1.6" rx="0.8" fill="#DD872B" />
      <rect x="6.4" y="23.3" width="19.2" height="1.6" rx="0.8" fill="#FAF8F2" />
      <path
        d="M10.5 21.5V10.5L16 17.5 21.5 10.5V21.5"
        fill="none"
        stroke="#FAF8F2"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
