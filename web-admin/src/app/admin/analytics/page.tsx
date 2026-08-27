"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Eye,
  Info,
  Megaphone,
  Music,
  Share2,
  Vote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states";
import { useAnalytics } from "@/hooks/use-phase2";
import { useCategoryMap } from "@/hooks/use-categories";

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  loading: boolean;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-sm">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight">
              {value.toLocaleString("en-IN")}
            </p>
          )}
        </div>
        {/* Colour rides the icon chip; the number stays in text ink. */}
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

/** A plain proportion bar. The number beside it carries the value. */
function Bar({ share, muted }: { share: number; muted?: boolean }) {
  return (
    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
      <div
        className={muted ? "bg-primary/35 h-full rounded-full" : "bg-primary h-full rounded-full"}
        style={{ width: `${Math.min(100, share)}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();
  const categories = useCategoryMap();

  const totals = data?.totals;
  const topReads = data?.topArticles[0]?.viewCount ?? 1;
  const topCategoryReads = data?.categoryMix[0]?.reads ?? 1;
  const topImpressions = data?.adPerformance[0]?.impressions ?? 1;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="What the newsroom's own counters say about reads, events, songs and advertising."
      />

      <Alert>
        <Info />
        <AlertTitle>Installs and daily active users are not here</AlertTitle>
        <AlertDescription>
          <p>
            Those live in Firebase Analytics, and reading them needs the GA4 Data
            API, a service account, and therefore a server. Building a second
            events pipeline to duplicate numbers Google already collects would cost
            weeks and give a worse answer.
          </p>
          <p>
            Everything below comes from counters this project owns, which nothing
            else reports on. Wire the GA4 dashboard in alongside it.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Article reads"
          value={totals?.reads ?? 0}
          icon={Eye}
          tone="bg-status-published/12 text-status-published"
          loading={isLoading}
        />
        <StatTile
          label="Shares"
          value={totals?.shares ?? 0}
          icon={Share2}
          tone="bg-status-scheduled/12 text-status-scheduled"
          loading={isLoading}
        />
        <StatTile
          label="Poll votes"
          value={totals?.pollVotes ?? 0}
          icon={Vote}
          tone="bg-status-review/12 text-status-review"
          loading={isLoading}
        />
        <StatTile
          label="Ad views"
          value={totals?.adImpressions ?? 0}
          icon={Megaphone}
          tone="bg-brand-saffron/15 text-brand-saffron"
          loading={isLoading}
        />
        <StatTile
          label="Published stories"
          value={totals?.published ?? 0}
          icon={BarChart3}
          tone="bg-muted text-muted-foreground"
          loading={isLoading}
        />
        <StatTile
          label="Events"
          value={totals?.events ?? 0}
          icon={CalendarDays}
          tone="bg-muted text-muted-foreground"
          loading={isLoading}
        />
        <StatTile
          label="Songs"
          value={totals?.songs ?? 0}
          icon={Music}
          tone="bg-muted text-muted-foreground"
          loading={isLoading}
        />
        <StatTile
          label="Ad clicks"
          value={totals?.adClicks ?? 0}
          icon={Megaphone}
          tone="bg-brand-saffron/15 text-brand-saffron"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most read stories</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.topArticles ?? []).length === 0 ? (
              <EmptyState
                icon={Eye}
                title="No reads recorded yet"
                description="Counts start once the app is in readers' hands."
                className="border-0 py-8"
              />
            ) : (
              <ul className="space-y-3">
                {(data?.topArticles ?? []).map((article) => (
                  <li key={article.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link
                        href={`/admin/news/${article.id}`}
                        className="truncate hover:underline"
                      >
                        {article.title}
                      </Link>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {article.viewCount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <Bar share={(article.viewCount / topReads) * 100} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reads by section</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (data?.categoryMix ?? []).length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Nothing to compare yet"
                className="border-0 py-8"
              />
            ) : (
              <ul className="space-y-3">
                {(data?.categoryMix ?? []).map((row) => (
                  <li key={row.categoryId} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">
                        {categories.get(row.categoryId)?.name ?? "Uncategorised"}
                        <span className="text-muted-foreground">
                          {" "}
                          · {row.count} stories
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {row.reads.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <Bar share={(row.reads / topCategoryReads) * 100} muted />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advertising delivery</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (data?.adPerformance ?? []).length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No ads running"
              description="Book an ad and its delivery figures appear here for the advertiser's report."
              className="border-0 py-8"
            />
          ) : (
            <ul className="space-y-3">
              {(data?.adPerformance ?? []).map((ad) => (
                <li key={ad.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{ad.name}</span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {ad.impressions.toLocaleString("en-IN")} views ·{" "}
                      {ad.clicks.toLocaleString("en-IN")} clicks · {ad.ctr.toFixed(1)}%
                    </span>
                  </div>
                  <Bar share={(ad.impressions / topImpressions) * 100} muted />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
