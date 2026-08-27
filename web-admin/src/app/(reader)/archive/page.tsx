"use client";

import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { ArticleCard } from "@/components/reader/article-card";
import { useLanguage } from "@/components/reader/language";
import { useArchiveMonths, usePagedFeed } from "@/hooks/use-phase2";
import { listCategories } from "@/lib/api/categories";
import { cn } from "@/lib/utils";

/**
 * The archive.
 *
 * Before this existed the feed took a flat limit and stopped, so a story fell
 * out of reach the moment enough newer ones were published — findable only by
 * someone who already had the link. Everything published is reachable from
 * here, by month and by section.
 */
export default function ArchivePage() {
  const { lang, pick } = useLanguage();
  const [month, setMonth] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const { data: months, isLoading: monthsLoading } = useArchiveMonths();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePagedFeed({ categoryId, month, pageSize: 12 });

  const activeCategories = (categories ?? []).filter((category) => category.active);
  const categoryById = new Map(activeCategories.map((c) => [c.id, c]));
  const articles = (data?.pages ?? []).flatMap((page) => page.articles);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {lang === "ta" ? "பழைய செய்திகள்" : "Archive"}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {lang === "ta"
          ? "வெளியிடப்பட்ட அனைத்து செய்திகளும் மாதவாரியாக."
          : "Everything ever published, by month and by section."}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ------------------------------ filters --------------------------- */}
        <aside className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold">
              {lang === "ta" ? "மாதம்" : "Month"}
            </h2>
            {monthsLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setMonth(null)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      month === null
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {lang === "ta" ? "எல்லா மாதங்களும்" : "All months"}
                  </button>
                </li>
                {(months ?? []).map((entry) => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => setMonth(entry.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        month === entry.key
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span>{entry.label}</span>
                      <span className="text-xs tabular-nums opacity-70">
                        {entry.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">
              {lang === "ta" ? "பிரிவு" : "Section"}
            </h2>
            <ul className="space-y-0.5">
              {[{ id: "all", name: "All sections", nameTa: "அனைத்தும்" }, ...activeCategories].map(
                (category) => (
                  <li key={category.id}>
                    <button
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        lang === "ta" && "font-tamil",
                        categoryId === category.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {pick(category.name, category.nameTa)}
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </aside>

        {/* ------------------------------ results --------------------------- */}
        <div>
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 w-full rounded-xl" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={Archive}
              title={lang === "ta" ? "செய்திகள் இல்லை" : "Nothing here"}
              description={
                lang === "ta"
                  ? "இந்த வடிகட்டலுக்கு செய்திகள் இல்லை."
                  : "No stories match this month and section."
              }
            />
          ) : (
            <>
              <StaggerList className="grid gap-5 sm:grid-cols-2">
                {articles.map((article) => (
                  <StaggerItem key={article.id}>
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
                    {lang === "ta" ? "மேலும் ஏற்று" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
