"use client";

import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * The full-bleed band at the top of a section landing.
 *
 * The photograph is a CSS background rather than next/image on purpose: these
 * files may not exist yet, and a background silently falls through to the
 * gradient beneath where next/image would request a 404 on every load. Once the
 * artwork lands it is worth moving to next/image — the matrimony hero went from
 * 1.8 MB to 18 KB on a phone that way.
 *
 * The gradient is defined in oklch against the section's own --primary, so each
 * section's hero carries its accent without any per-page colour being written.
 */
export function HeroBand({
  eyebrow,
  title,
  lead,
  image,
  actions,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  /** Optional. Falls back to the gradient alone. */
  image?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden", className)}>
      {/* Accent wash, always present. */}
      <div
        aria-hidden
        className="from-primary absolute inset-0 -z-20 bg-gradient-to-br to-[oklch(0.22_0.05_270)]"
      />

      {image && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${image}')` }}
        />
      )}

      {/* Scrim: white text has to hold up over any photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,oklch(0.16_0.04_260/0.92)_0%,oklch(0.2_0.05_260/0.74)_48%,oklch(0.28_0.06_260/0.5)_100%)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-medium tracking-wide text-white/70 uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              {lead}
            </p>
            {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
          </FadeIn>

          {aside && <FadeIn delay={0.1}>{aside}</FadeIn>}
        </div>
      </div>
    </section>
  );
}

/** A single figure for the hero's right-hand rail. */
export function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs text-white/70">{label}</p>
    </div>
  );
}
