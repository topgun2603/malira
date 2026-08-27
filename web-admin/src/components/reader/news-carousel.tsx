"use client";

import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { ImageIcon, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Article, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language";

/**
 * The top-stories carousel.
 *
 * Autoplay is on but stoppable, and it does not start at all when the reader
 * has asked for reduced motion — a carousel that moves under someone trying to
 * read it is the most common accessibility failure of this pattern.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function NewsCarousel({
  articles,
  categories,
  heading,
  autoplayEnabled = true,
  intervalSeconds = 6,
}: {
  articles: Article[];
  categories: Map<string, Category>;
  /** Optional heading, e.g. "Editor's picks". */
  heading?: string;
  autoplayEnabled?: boolean;
  intervalSeconds?: number;
}) {
  const { pick, langAttr } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  // Embla always starts on the first slide, so 0 is the correct initial value
  // and the "select" subscription below carries it from there.
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(autoplayEnabled);

  // The media query is an external store. Reading it through useSyncExternalStore
  // avoids both the hydration mismatch and a wrong first render.
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  // Held in state, not a ref: the plugin instance is read during render when it
  // is handed to <Carousel>, and refs must not be read there.
  const [autoplay] = useState(() =>
    Autoplay({
      delay: Math.max(2, intervalSeconds) * 1000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  // Autoplay is off when the desk turned it off, and always off for a reader
  // who has asked for reduced motion.
  const motionAllowed = autoplayEnabled && !prefersReducedMotion;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  function togglePlay() {
    if (playing) {
      autoplay.stop();
      setPlaying(false);
    } else {
      autoplay.play();
      setPlaying(true);
    }
  }

  if (articles.length === 0) return null;

  return (
    <section aria-label={heading || "Top stories"} className="relative">
      {heading && (
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
          {heading}
        </h2>
      )}
      <Carousel
        setApi={setApi}
        opts={{ loop: articles.length > 1, align: "start" }}
        plugins={motionAllowed ? [autoplay] : []}
      >
        <CarouselContent>
          {articles.map((article) => {
            const category = categories.get(article.categoryId);
            const lead = article.images[0];
            const title = pick(article.title, article.titleTa);

            return (
              <CarouselItem key={article.id}>
                <Link
                  href={`/article/${article.id}`}
                  className="group relative block overflow-hidden rounded-2xl"
                >
                  <div className="bg-muted text-muted-foreground relative aspect-[16/9] sm:aspect-[21/9]">
                    {lead ? (
                      <NextImage
                        src={lead.url}
                        alt=""
                        fill
                        unoptimized
                        priority
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 900px"
                      />
                    ) : (
                      <ImageIcon className="absolute inset-0 m-auto size-8" />
                    )}
                    {/* Scrim, so white text stays legible on any photograph. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                    {category && (
                      <Badge className="bg-primary text-primary-foreground mb-2 border-0 font-normal">
                        {pick(category.name, category.nameTa)}
                      </Badge>
                    )}
                    <h2
                      lang={langAttr(article.title, article.titleTa)}
                      className="max-w-3xl text-xl leading-snug font-semibold text-white sm:text-3xl"
                    >
                      {title}
                    </h2>
                    <p className="mt-2 text-xs text-white/70 sm:text-sm">
                      {article.authorName || article.createdByName}
                      {article.publishedAt &&
                        ` · ${format(article.publishedAt.toDate(), "d MMM yyyy")}`}
                    </p>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {articles.length > 1 && (
          <>
            <CarouselPrevious className="left-3 hidden sm:inline-flex" />
            <CarouselNext className="right-3 hidden sm:inline-flex" />
          </>
        )}
      </Carousel>

      {articles.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {articles.map((article, index) => (
              <button
                key={article.id}
                type="button"
                aria-label={`Go to story ${index + 1}`}
                aria-current={index === current}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === current
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5",
                )}
              />
            ))}
          </div>

          {motionAllowed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={playing ? "Pause automatic rotation" : "Resume rotation"}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
