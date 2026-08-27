"use client";

import { useState } from "react";
import { GalleryHorizontal, Pause, Play, Plus, Trash2 } from "lucide-react";
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
import { CarouselForm } from "@/components/carousels/carousel-form";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import {
  usePagedCarousels,
  useCreateCarousel,
  useDeleteCarousel,
  useSetCarouselStatus,
  useUpdateCarousel,
} from "@/hooks/use-engagement";
import type { CarouselDraft } from "@/lib/api/carousels";
import { CAROUSEL_PLACEMENT_LABELS, type StoryCarousel } from "@/lib/types";

export default function CarouselsPage() {
  const page = usePagedCarousels();
  const carousels = page.items;
  const isLoading = page.isLoading;
  const createCarousel = useCreateCarousel();
  const updateCarousel = useUpdateCarousel();
  const setStatus = useSetCarouselStatus();
  const deleteCarousel = useDeleteCarousel();

  const [mode, setMode] = useState<"list" | "new" | "edit">("list");
  const [editing, setEditing] = useState<StoryCarousel | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoryCarousel | null>(null);

  function handleSubmit(draft: CarouselDraft) {
    if (mode === "edit" && editing) {
      updateCarousel.mutate(
        { id: editing.id, draft },
        { onSuccess: () => setMode("list") },
      );
    } else {
      createCarousel.mutate(draft, { onSuccess: () => setMode("list") });
    }
  }

  if (mode !== "list") {
    return (
      <>
        <PageHeader
          title={mode === "edit" ? "Edit carousel" : "New carousel"}
          description="Choose the stories by hand, then pick the slot they run in."
        />
        <CarouselForm
          carousel={mode === "edit" ? (editing ?? undefined) : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setMode("list")}
          saving={createCarousel.isPending || updateCarousel.isPending}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Story carousels"
        description="Curated sliders of published stories, placed like ads across the reader site."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setMode("new");
            }}
          >
            <Plus className="size-4" />
            New carousel
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : carousels.length === 0 ? (
        <EmptyState
          icon={GalleryHorizontal}
          title="No carousels yet"
          description="The lead story still runs big at the top of the feed on its own. A carousel is an extra, curated block you can drop above it, under it, inside the feed, or after an article."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setMode("new");
              }}
            >
              Create the first carousel
            </Button>
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {carousels.map((carousel) => (
            <StaggerItem key={carousel.id}>
              <Card>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={carousel.status === "active" ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {carousel.status === "active" ? "Running" : "Draft"}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {CAROUSEL_PLACEMENT_LABELS[carousel.placement]} ·{" "}
                        {carousel.articleIds.length} stories ·{" "}
                        {carousel.autoplay
                          ? `rotates every ${carousel.intervalSeconds}s`
                          : "manual only"}
                      </span>
                    </div>
                    <p className="font-medium">{carousel.name}</p>
                    {carousel.title && (
                      <p className="text-muted-foreground text-sm">
                        Heading: {carousel.title}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {carousel.status !== "active" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setStatus.mutate({ id: carousel.id, status: "active" })
                        }
                      >
                        <Play className="size-4" />
                        Run
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatus.mutate({ id: carousel.id, status: "draft" })
                        }
                      >
                        <Pause className="size-4" />
                        Pause
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(carousel);
                        setMode("edit");
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9"
                      aria-label={`Delete ${carousel.name}`}
                      onClick={() => setPendingDelete(carousel)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
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
        noun="carousel"
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(value) => !value && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this carousel?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the selection is removed. The {pendingDelete?.articleIds.length ?? 0}{" "}
              stories in it are untouched and stay published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteCarousel.mutate(pendingDelete.id);
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
