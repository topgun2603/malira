"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useState } from "react";
import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ImageIcon,
  MapPin,
  Phone,
  Repeat,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion/primitives";
import { HeroBand, HeroStat } from "@/components/reader/hero-band";
import { useLanguage } from "@/components/reader/language";
import { AdSlot } from "@/components/reader/ad-slot";
import { useUpcomingEvents } from "@/hooks/use-phase2";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_LABELS_TA,
  RECURRENCE_LABELS,
  type EventCategory,
  type EventItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Drop a file here and the hero picks it up; see public/events/IMAGE-PROMPTS.md */
const HERO_IMAGE = "/events/hero.png";

function whenLabel(date: Date, lang: string): string {
  if (isToday(date)) return lang === "ta" ? "இன்று" : "Today";
  if (isTomorrow(date)) return lang === "ta" ? "நாளை" : "Tomorrow";
  return format(date, "EEEE, d MMMM");
}

/** The soonest event, given the full-width treatment. */
function NextUp({ event }: { event: EventItem }) {
  const { lang, pick, langAttr } = useLanguage();
  const starts = event.startsAt?.toDate();
  const ends = event.endsAt?.toDate();

  return (
    <FadeIn>
      <Link
        href={`/events/${event.id}`}
        className="group bg-card hover:border-primary/40 grid overflow-hidden rounded-2xl border transition-colors lg:grid-cols-[minmax(0,1fr)_44%]"
      >
        <div className="order-2 flex flex-col justify-center p-6 sm:p-10 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="font-normal">
              {lang === "ta" ? "அடுத்தது" : "Next up"}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {lang === "ta"
                ? EVENT_CATEGORY_LABELS_TA[event.category]
                : EVENT_CATEGORY_LABELS[event.category]}
            </Badge>
            {event.recurrence !== "none" && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Repeat className="size-3" />
                {RECURRENCE_LABELS[event.recurrence]}
              </span>
            )}
          </div>

          <h2
            lang={langAttr(event.title, event.titleTa)}
            className="group-hover:text-primary mt-4 text-2xl leading-tight font-semibold tracking-tight transition-colors sm:text-4xl"
          >
            {pick(event.title, event.titleTa)}
          </h2>

          <dl className="text-muted-foreground mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {starts && (
              <div className="flex items-start gap-2.5">
                <CalendarDays className="text-primary mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-foreground font-medium">
                    {whenLabel(starts, lang)}
                  </dt>
                  <dd>
                    {format(starts, "h:mm a")}
                    {ends && !isSameDay(starts, ends)
                      ? ` – ${format(ends, "d MMM")}`
                      : ends
                        ? ` – ${format(ends, "h:mm a")}`
                        : ""}
                  </dd>
                </div>
              </div>
            )}
            {event.venue && (
              <div className="flex items-start gap-2.5">
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-foreground font-medium">
                    {pick(event.venue, event.venueTa)}
                  </dt>
                  {event.organiserName && <dd>{event.organiserName}</dd>}
                </div>
              </div>
            )}
          </dl>

          <p className="text-primary mt-6 flex items-center gap-1.5 text-sm font-medium">
            {lang === "ta" ? "விவரங்கள்" : "Full details"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </p>
        </div>

        <div className="bg-muted text-muted-foreground relative order-1 aspect-[16/10] lg:order-2 lg:aspect-auto">
          {event.poster ? (
            <NextImage
              src={event.poster.url}
              alt=""
              fill
              unoptimized
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          ) : (
            <div className="from-primary/25 to-primary/5 absolute inset-0 flex items-center justify-center bg-gradient-to-br">
              <CalendarDays className="text-primary/40 size-16" />
            </div>
          )}
        </div>
      </Link>
    </FadeIn>
  );
}

function EventRow({ event }: { event: EventItem }) {
  const { lang, pick, langAttr } = useLanguage();
  const starts = event.startsAt?.toDate();

  return (
    <Link
      href={`/events/${event.id}`}
      className="group bg-card hover:border-primary/40 flex gap-4 rounded-xl border p-3 transition-colors"
    >
      {starts && (
        <div className="bg-primary/10 text-primary flex size-16 shrink-0 flex-col items-center justify-center rounded-lg">
          <span className="text-[10px] font-semibold uppercase">
            {format(starts, "MMM")}
          </span>
          <span className="text-2xl leading-none font-semibold">
            {format(starts, "d")}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Badge variant="secondary" className="mb-1 font-normal">
          {lang === "ta"
            ? EVENT_CATEGORY_LABELS_TA[event.category]
            : EVENT_CATEGORY_LABELS[event.category]}
        </Badge>
        <h3
          lang={langAttr(event.title, event.titleTa)}
          className="group-hover:text-primary leading-snug font-medium"
        >
          {pick(event.title, event.titleTa)}
        </h3>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
          {starts && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {format(starts, "h:mm a")}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {pick(event.venue, event.venueTa)}
            </span>
          )}
          {event.organiserPhone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" />
              {event.organiserPhone}
            </span>
          )}
        </div>
      </div>

      {event.poster ? (
        <div className="bg-muted relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg sm:block">
          <NextImage
            src={event.poster.url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="96px"
          />
        </div>
      ) : (
        <ImageIcon className="text-muted-foreground/30 hidden size-5 self-center sm:block" />
      )}
    </Link>
  );
}

export default function ReaderEventsPage() {
  const { lang, pick } = useLanguage();
  const { data: events, isLoading } = useUpcomingEvents();
  const [category, setCategory] = useState<EventCategory | "all">("all");

  const all = events ?? [];
  const filtered = all.filter(
    (event) => category === "all" || event.category === category,
  );
  const [next, ...rest] = filtered;

  // Grouped by month, so a long calendar reads as a calendar rather than a list.
  const byMonth = new Map<string, EventItem[]>();
  for (const event of rest) {
    const date = event.startsAt?.toDate();
    const key = date ? format(date, "MMMM yyyy") : "Later";
    byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
  }

  const thisWeek = all.filter((event) => {
    const date = event.startsAt?.toDate();
    if (!date) return false;
    const week = new Date();
    week.setDate(week.getDate() + 7);
    return date <= week;
  }).length;

  return (
    <>
      <HeroBand
        image={HERO_IMAGE}
        eyebrow={lang === "ta" ? "நிகழ்வுகள்" : "Events"}
        title={
          lang === "ta" ? (
            <span className="font-tamil">
              மாவட்டத்தில்
              <br />
              என்ன நடக்கிறது
            </span>
          ) : (
            <>
              What is happening
              <br />
              across the hills
            </>
          )
        }
        lead={
          lang === "ta"
            ? "பண்டிகைகள், பொதுக் கூட்டங்கள், விழாக்கள், விளையாட்டு மற்றும் கலை நிகழ்ச்சிகள் — ஒரே இடத்தில்."
            : "Festivals, public meetings, functions, sport and cultural evenings — the district calendar in one place."
        }
        aside={
          all.length > 0 ? (
            <div className="flex gap-3">
              <HeroStat
                value={String(all.length)}
                label={lang === "ta" ? "வரவிருக்கும் நிகழ்வுகள்" : "Coming up"}
              />
              <HeroStat
                value={String(thisWeek)}
                label={lang === "ta" ? "இந்த வாரம்" : "In the next 7 days"}
              />
            </div>
          ) : undefined
        }
      />

      {/* ---------------------------- category rail ------------------------ */}
      <nav className="bg-background/85 sticky top-[6.6rem] z-30 border-b backdrop-blur md:top-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="scrollbar-none flex gap-1 overflow-x-auto py-2">
            {(["all", ...EVENT_CATEGORIES] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-current={category === value ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                  category === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {value === "all"
                  ? lang === "ta"
                    ? "அனைத்தும்"
                    : "All"
                  : lang === "ta"
                    ? EVENT_CATEGORY_LABELS_TA[value]
                    : EVENT_CATEGORY_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={lang === "ta" ? "நிகழ்வுகள் இல்லை" : "Nothing coming up"}
            description={
              lang === "ta"
                ? "புதிய நிகழ்வு அறிவிக்கப்பட்டவுடன் இங்கே தோன்றும்."
                : "New events appear here as soon as they are announced."
            }
          />
        ) : (
          <div className="space-y-12">
            <NextUp event={next} />

            <AdSlot placement="article_top" />

            {[...byMonth.entries()].map(([month, monthEvents]) => (
              <section key={month}>
                <h2 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                  {month}
                </h2>
                <StaggerList className="space-y-3">
                  {monthEvents.map((event) => (
                    <StaggerItem key={event.id}>
                      <EventRow event={event} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              </section>
            ))}

            <p className="text-muted-foreground border-t pt-8 text-center text-sm">
              {lang === "ta"
                ? "உங்கள் நிகழ்வை இங்கே சேர்க்க ஆசிரியர் குழுவைத் தொடர்பு கொள்ளுங்கள்."
                : "Organising something? Contact the desk to have it listed."}{" "}
              <Link
                href="/about"
                className="text-primary underline underline-offset-2"
              >
                {pick("Get in touch", "தொடர்பு கொள்ள")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
