"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, FileQuestion, MapPin, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { FadeIn } from "@/components/motion/primitives";
import { AdSlot } from "@/components/reader/ad-slot";
import { useLanguage } from "@/components/reader/language";
import { usePublicEvent } from "@/hooks/use-phase2";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_LABELS_TA,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ReaderEventPage() {
  const params = useParams<{ id: string }>();
  const { lang, pick, langAttr } = useLanguage();
  const { data: event, isLoading } = usePublicEvent(params.id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={FileQuestion}
          title={lang === "ta" ? "நிகழ்வு கிடைக்கவில்லை" : "Event not found"}
          description={
            lang === "ta"
              ? "இது நீக்கப்பட்டிருக்கலாம் அல்லது இன்னும் அறிவிக்கப்படவில்லை."
              : "It may have been removed, or it was never published."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/events">
                <ArrowLeft className="size-4" />
                All events
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const starts = event.startsAt?.toDate();
  const ends = event.endsAt?.toDate();
  const title = pick(event.title, event.titleTa);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link href="/events">
          <ArrowLeft className="size-4" />
          {lang === "ta" ? "நிகழ்வுகள்" : "All events"}
        </Link>
      </Button>

      <FadeIn>
        <Badge variant="secondary" className="font-normal">
          {lang === "ta"
            ? EVENT_CATEGORY_LABELS_TA[event.category]
            : EVENT_CATEGORY_LABELS[event.category]}
        </Badge>

        <h1
          lang={langAttr(event.title, event.titleTa)}
          className={cn(
            "mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl",
            langAttr(event.title, event.titleTa) === "ta" && "font-tamil",
          )}
        >
          {title}
        </h1>

        {event.status === "cancelled" && (
          <p className="text-destructive mt-2 font-medium">
            {lang === "ta" ? "இந்த நிகழ்வு ரத்து செய்யப்பட்டது." : "This event has been cancelled."}
          </p>
        )}

        {event.poster && (
          <div className="bg-muted relative mt-6 aspect-[4/3] overflow-hidden rounded-xl sm:aspect-[16/9]">
            <NextImage
              src={event.poster.url}
              alt=""
              fill
              unoptimized
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {starts && (
            <div className="flex gap-3">
              <CalendarDays className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">
                  {lang === "ta" ? "தேதி & நேரம்" : "Date and time"}
                </dt>
                <dd className="text-sm font-medium">
                  {format(starts, "EEEE, d MMMM yyyy")}
                  <br />
                  {format(starts, "h:mm a")}
                  {ends && ` – ${format(ends, "h:mm a")}`}
                </dd>
              </div>
            </div>
          )}

          {event.venue && (
            <div className="flex gap-3">
              <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">
                  {lang === "ta" ? "இடம்" : "Venue"}
                </dt>
                <dd className="text-sm font-medium">
                  {pick(event.venue, event.venueTa)}
                  {event.mapUrl && (
                    <>
                      <br />
                      <a
                        href={event.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs underline underline-offset-2"
                      >
                        {lang === "ta" ? "வரைபடத்தில் பார்" : "Open in Maps"}
                      </a>
                    </>
                  )}
                </dd>
              </div>
            </div>
          )}

          {event.organiserName && (
            <div className="flex gap-3">
              <User className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">
                  {lang === "ta" ? "ஏற்பாட்டாளர்" : "Organiser"}
                </dt>
                <dd className="text-sm font-medium">{event.organiserName}</dd>
              </div>
            </div>
          )}

          {event.organiserPhone && (
            <div className="flex gap-3">
              <Phone className="text-primary mt-0.5 size-5 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs">
                  {lang === "ta" ? "தொடர்பு" : "Contact"}
                </dt>
                <dd className="text-sm font-medium">
                  <a href={`tel:${event.organiserPhone}`} className="hover:underline">
                    {event.organiserPhone}
                  </a>
                </dd>
              </div>
            </div>
          )}
        </dl>

        <Separator className="my-6" />

        <p
          lang={langAttr(event.description, event.descriptionTa)}
          className={cn(
            "text-[15px] leading-7 whitespace-pre-line",
            langAttr(event.description, event.descriptionTa) === "ta" && "font-tamil",
          )}
        >
          {pick(event.description, event.descriptionTa)}
        </p>

        <AdSlot placement="article_end" className="mt-8" />
      </FadeIn>
    </article>
  );
}
