"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useCarouselArticles, useCarouselForPlacement } from "@/hooks/use-engagement";
import type { Category, CarouselPlacement } from "@/lib/types";
import { NewsCarousel } from "./news-carousel";
import { useLanguage } from "./language";

/**
 * Renders whatever carousel the desk has booked into a slot, or nothing.
 *
 * Same contract as AdSlot: an unbooked slot collapses completely rather than
 * reserving space. Stories are curated by hand in the admin, not derived from
 * a query — "the five newest" is a rule the desk cannot override, and there is
 * always a week where the newest five are not the five worth leading with.
 */
export function CarouselSlot({
  placement,
  categories,
  className,
}: {
  placement: CarouselPlacement;
  categories: Map<string, Category>;
  className?: string;
}) {
  const { pick } = useLanguage();
  const { data: carousel, isLoading } = useCarouselForPlacement(placement);
  const { data: articles, isLoading: articlesLoading } = useCarouselArticles(
    carousel?.articleIds ?? [],
  );

  if (isLoading) return null;
  if (!carousel || carousel.articleIds.length === 0) return null;

  if (articlesLoading) {
    return <Skeleton className={className ?? "h-72 w-full rounded-2xl"} />;
  }

  // Every curated story could have been unpublished since it was picked.
  if (!articles || articles.length === 0) return null;

  return (
    <div className={className}>
      <NewsCarousel
        articles={articles}
        categories={categories}
        heading={carousel.title ? pick(carousel.title, carousel.titleTa) : undefined}
        autoplayEnabled={carousel.autoplay}
        intervalSeconds={carousel.intervalSeconds}
      />
    </div>
  );
}
