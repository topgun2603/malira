"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Newspaper, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/reader/article-card";
import { CarouselSlot } from "@/components/reader/carousel-slot";
import { PollWidget } from "@/components/reader/poll-widget";
import { AdSlot } from "@/components/reader/ad-slot";
import { useLanguage } from "@/components/reader/language";
import { EmptyState } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { listCategories } from "@/lib/api/categories";
import { listMostRead } from "@/lib/api/public-news";
import { usePagedFeed } from "@/hooks/use-phase2";
import { cn } from "@/lib/utils";

export default function ReaderHomePage() {
  const { lang, pick } = useLanguage();
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  // Paged, so nothing published ever drops out of reach. The old flat limit of
  // 40 made story 41 unreachable from the site the day it went out.
  const {
    data: feedPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePagedFeed({ categoryId, pageSize: 12 });

  const { data: mostRead } = useQuery({
    queryKey: ["public", "most-read"],
    queryFn: () => listMostRead(5),
    staleTime: 5 * 60_000,
  });

  const activeCategories = (categories ?? []).filter((category) => category.active);
  const categoryById = new Map(activeCategories.map((c) => [c.id, c]));

  const feed = (feedPages?.pages ?? []).flatMap((page) => page.articles);
  // The lead story is the pinned one when there is a pin, otherwise the newest —
  // listPublishedArticles already sorts pinned first. It runs big, as the front
  // page of a paper does. Carousels are curated separately in the admin, so any
  // overlap with the lead is the desk's deliberate choice.
  const [hero, ...rest] = feed;

  return (
    <>
      {/* ------------------------------ Masthead --------------------------- */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-primary text-sm font-medium">
            {lang === "ta" ? "இன்றைய செய்திகள்" : "Today from the district"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {lang === "ta" ? "செய்திகள்" : "News"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            {lang === "ta"
              ? "உள்ளூர் செய்திகள், சமூக அறிவிப்புகள், அரசு தகவல்கள் மற்றும் தேயிலைத் தோட்டச் செய்திகள் ஒரே இடத்தில்."
              : "Local reporting, community notices, government updates and news from the tea gardens, in one place."}
          </p>
        </div>
      </section>

      {/* ----------------------------- Category nav ------------------------ */}
      <nav className="bg-background/85 sticky top-[6.6rem] z-30 border-b backdrop-blur md:top-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="scrollbar-none flex gap-1 overflow-x-auto py-2">
            {[{ id: "all", name: "All", nameTa: "அனைத்தும்" }, ...activeCategories].map(
              (category) => {
                const active = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(category.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                      lang === "ta" && "font-tamil",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {pick(category.name, category.nameTa)}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </nav>

      {/* -------------------------------- Feed ----------------------------- */}
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-xl" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : feed.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={
              lang === "ta" ? "இன்னும் செய்திகள் இல்லை" : "No stories published yet"
            }
            description={
              lang === "ta"
                ? "ஆசிரியர் குழு செய்தி வெளியிட்டவுடன் இங்கே தோன்றும்."
                : "Anything the desk publishes appears here straight away."
            }
            action={
              <Button asChild variant="outline">
                <Link href="/admin/dashboard">Open the editorial desk</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <AdSlot placement="home_top" />

              <CarouselSlot placement="home_top" categories={categoryById} />

              <ArticleCard
                article={hero}
                category={categoryById.get(hero.categoryId)}
                variant="hero"
              />

              <CarouselSlot
                placement="home_after_hero"
                categories={categoryById}
              />

              {rest.length > 0 && (
                <div>
                  <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">
                    {lang === "ta" ? "மேலும் செய்திகள்" : "More stories"}
                  </h2>
                  <StaggerList className="grid gap-5 sm:grid-cols-2">
                    {rest.map((article, index) => (
                      <StaggerItem key={article.id}>
                        {/* One in-feed ad, after the fourth story. More than
                            that and the feed stops reading as a newspaper. */}
                        {index === 4 && (
                          <>
                            <AdSlot placement="home_feed" className="mb-5" />
                            <CarouselSlot
                              placement="home_feed"
                              categories={categoryById}
                              className="mb-5"
                            />
                          </>
                        )}
                        <ArticleCard
                          article={article}
                          category={categoryById.get(article.categoryId)}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerList>

                  {hasNextPage && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => void fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        {lang === "ta" ? "மேலும் ஏற்று" : "Load more stories"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <CarouselSlot placement="home_bottom" categories={categoryById} />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
              <PollWidget surface="sidebar" />

              <AdSlot placement="home_sidebar" />

              <div className="bg-card rounded-xl border p-4">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="text-primary size-4" />
                  {lang === "ta" ? "அதிகம் படித்தவை" : "Most read"}
                </h2>
                <div className="divide-y">
                  {(mostRead ?? []).map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      category={categoryById.get(article.categoryId)}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>

              <div className="bg-accent/40 rounded-xl border p-4">
                <p className="text-sm font-medium">
                  {lang === "ta" ? "செயலி விரைவில்" : "The app is coming"}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {lang === "ta"
                    ? "இதே செய்திகள், நிகழ்வுகள் மற்றும் பாடல்கள் விரைவில் ஆண்ட்ராய்டு செயலியில்."
                    : "The same stories, plus events and songs, are on the way to Android."}
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
