"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Megaphone, MousePointerClick, Pause, Play, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { AdForm } from "@/components/ads/ad-form";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import {
  usePagedAds,
  useCreateAd,
  useDeleteAd,
  useSetAdStatus,
  useUpdateAd,
} from "@/hooks/use-engagement";
import type { AdDraft } from "@/lib/api/ads";
import {
  AD_FORMAT_LABELS,
  AD_PLACEMENT_LABELS,
  AD_STATUS_LABELS,
  type Ad,
} from "@/lib/types";

function flightLabel(ad: Ad): string {
  const start = ad.startsAt ? format(ad.startsAt.toDate(), "d MMM") : null;
  const end = ad.endsAt ? format(ad.endsAt.toDate(), "d MMM yyyy") : null;
  if (start && end) return `${start} – ${end}`;
  if (start) return `from ${start}`;
  if (end) return `until ${end}`;
  return "No end date";
}

export default function AdsPage() {
  const page = usePagedAds();
  const ads = page.items;
  const isLoading = page.isLoading;
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const setStatus = useSetAdStatus();
  const deleteAd = useDeleteAd();

  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<Ad | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Ad | null>(null);

  function handleSubmit(draft: AdDraft) {
    if (mode === "edit" && editing) {
      updateAd.mutate(
        { id: editing.id, draft },
        { onSuccess: () => setMode("list") },
      );
    } else {
      createAd.mutate(draft, { onSuccess: () => setMode("list") });
    }
  }

  if (mode !== "list") {
    return (
      <>
        <PageHeader
          title={mode === "edit" ? "Edit ad" : "New ad"}
          description="Pick the slot first — it decides which formats are available."
        />
        <AdForm
          ad={mode === "edit" ? (editing ?? undefined) : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setMode("list")}
          saving={createAd.isPending || updateAd.isPending}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Advertising"
        description="Banners, in-feed cards, sidebar boxes and popups across the reader site."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setMode("new");
            }}
          >
            <Plus className="size-4" />
            New ad
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : ads.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No ads booked"
          description="Every slot collapses when nothing is booked, so the reader site looks the same as it does now until you run something."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setMode("new");
              }}
            >
              Create the first ad
            </Button>
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {ads.map((ad) => {
            const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
            return (
              <StaggerItem key={ad.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={ad.status === "active" ? "default" : "secondary"}
                          className="font-normal"
                        >
                          {AD_STATUS_LABELS[ad.status]}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {AD_PLACEMENT_LABELS[ad.placement]} ·{" "}
                          {AD_FORMAT_LABELS[ad.format]} · {flightLabel(ad)}
                        </span>
                      </div>
                      <p className="font-medium">{ad.name}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {ad.advertiser && `${ad.advertiser} — `}
                        {ad.headline}
                      </p>
                    </div>

                    <div className="text-muted-foreground flex shrink-0 gap-5 text-sm">
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {ad.impressions.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs">Views</p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {ad.clicks.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs">Clicks</p>
                      </div>
                      <div>
                        <p className="text-foreground flex items-center gap-1 font-medium tabular-nums">
                          <MousePointerClick className="size-3.5" />
                          {ctr.toFixed(1)}%
                        </p>
                        <p className="text-xs">CTR</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {ad.status !== "active" ? (
                        <Button
                          size="sm"
                          onClick={() => setStatus.mutate({ id: ad.id, status: "active" })}
                        >
                          <Play className="size-4" />
                          Run
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus.mutate({ id: ad.id, status: "paused" })}
                        >
                          <Pause className="size-4" />
                          Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(ad);
                          setMode("edit");
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9"
                        aria-label={`Delete ${ad.name}`}
                        onClick={() => setPendingDelete(ad)}
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <PaginationBar
        pageIndex={page.pageIndex}
        pageSize={page.pageSize}
        setPageSize={page.setPageSize}
        hasPrev={page.hasPrev}
        hasNext={page.hasNext}
        onPrev={page.prev}
        onNext={page.next}
        total={page.total}
        pageCount={page.pageCount}
        loading={page.isFetching}
        noun="ad"
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(value) => !value && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              The creative and its {pendingDelete?.impressions ?? 0} recorded views go
              with it. Pausing keeps the figures for the advertiser&rsquo;s report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteAd.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
