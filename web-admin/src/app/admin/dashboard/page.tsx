"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  FileEdit,
  History,
  Inbox,
  Plus,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/news/status-badge";
import { EmptyState } from "@/components/shared/states";
import { SampleDataCard } from "@/components/shared/sample-data-card";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useAuth } from "@/components/providers/auth-provider";
import { useArticles, useRecentActivity } from "@/hooks/use-articles";
import { useCategories, useSeedCategories } from "@/hooks/use-categories";
import { can } from "@/lib/permissions";
import type { ActivityEntry } from "@/lib/types";

/**
 * Stat tiles, not charts. There is no history to plot until the app has been
 * live for a while, and a sparkline over three data points is decoration.
 * Real analytics arrives with the Analytics screen in the next phase.
 */
function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  href,
  loading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  href: string;
  loading: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="hover:border-primary/40 h-full transition-colors">
        <CardContent className="flex items-start justify-between gap-4 p-5">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-sm">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-3xl font-semibold tracking-tight">
                {value.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          {/* Colour sits on the icon chip, never on the number itself. */}
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
          >
            <Icon className="size-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

const ACTION_TEXT: Record<ActivityEntry["action"], string> = {
  created: "created",
  updated: "edited",
  submitted: "submitted for approval",
  approved: "approved",
  rejected: "sent back",
  published: "published",
  unpublished: "unpublished",
  scheduled: "scheduled",
  deleted: "deleted",
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: categories } = useCategories();
  const seedCategories = useSeedCategories();

  const published = useArticles({ status: "published" });
  const inReview = useArticles({ status: "in_review" });
  const drafts = useArticles({ status: "draft" });
  const scheduled = useArticles({ status: "scheduled" });
  const { data: activity, isLoading: activityLoading } = useRecentActivity(10);

  const needsCategories = categories !== undefined && categories.length === 0;
  const firstName = profile?.displayName?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Everything happening on the news desk right now."
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <Plus className="size-4" />
              New article
            </Link>
          </Button>
        }
      />

      {needsCategories && can(profile?.role, "categories.manage") && (
        <Card className="border-brand-saffron/40 bg-accent/40">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Tags className="text-accent-foreground mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">No categories yet</p>
                <p className="text-muted-foreground text-sm">
                  Add the seven categories from the Phase 1 scope in one click. You
                  can rename or reorder them afterwards.
                </p>
              </div>
            </div>
            <Button
              onClick={() => seedCategories.mutate()}
              disabled={seedCategories.isPending}
            >
              Add default categories
            </Button>
          </CardContent>
        </Card>
      )}

      <SampleDataCard />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Published"
          value={published.data?.length ?? 0}
          icon={CheckCircle2}
          tone="bg-status-published/12 text-status-published"
          href="/admin/news?status=published"
          loading={published.isLoading}
        />
        <StatTile
          label="Waiting for approval"
          value={inReview.data?.length ?? 0}
          icon={Inbox}
          tone="bg-status-review/12 text-status-review"
          href="/admin/news/approvals"
          loading={inReview.isLoading}
        />
        <StatTile
          label="Drafts"
          value={drafts.data?.length ?? 0}
          icon={FileEdit}
          tone="bg-status-draft/12 text-status-draft"
          href="/admin/news?status=draft"
          loading={drafts.isLoading}
        />
        <StatTile
          label="Scheduled"
          value={scheduled.data?.length ?? 0}
          icon={CalendarClock}
          tone="bg-status-scheduled/12 text-status-scheduled"
          href="/admin/news?status=scheduled"
          loading={scheduled.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest published</CardTitle>
          </CardHeader>
          <CardContent>
            {published.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (published.data ?? []).length === 0 ? (
              <EmptyState
                icon={FileEdit}
                title="Nothing published yet"
                description="The first story you publish shows up here and in the app feed."
                className="border-0 py-10"
              />
            ) : (
              <StaggerList className="divide-y">
                {(published.data ?? []).slice(0, 6).map((article) => (
                  <StaggerItem key={article.id}>
                    <Link
                      href={`/admin/news/${article.id}`}
                      className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {article.title}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {article.authorName || article.createdByName}
                          {article.publishedAt &&
                            ` · ${formatDistanceToNow(article.publishedAt.toDate(), { addSuffix: true })}`}
                        </p>
                      </div>
                      <StatusBadge status={article.status} />
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (activity ?? []).length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Nothing has happened yet.
              </p>
            ) : (
              <ul className="space-y-3.5">
                {(activity ?? []).map((entry) => (
                  <li key={entry.id} className="text-sm leading-snug">
                    <span className="font-medium">{entry.actorName}</span>{" "}
                    <span className="text-muted-foreground">
                      {ACTION_TEXT[entry.action]}
                    </span>{" "}
                    <span className="text-foreground/90">{entry.articleTitle}</span>
                    {entry.at && (
                      <span className="text-muted-foreground block text-xs">
                        {formatDistanceToNow(entry.at.toDate(), { addSuffix: true })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
