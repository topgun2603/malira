"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ImageIcon, Inbox, SquarePen, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useArticles, useChangeStatus } from "@/hooks/use-articles";
import { useCategoryMap } from "@/hooks/use-categories";
import type { Article } from "@/lib/types";

export default function ApprovalsPage() {
  const { data: articles, isLoading } = useArticles({ status: "in_review" });
  const categories = useCategoryMap();
  const changeStatus = useChangeStatus();
  const [rejecting, setRejecting] = useState<Article | null>(null);
  const [note, setNote] = useState("");

  function approve(article: Article) {
    changeStatus.mutate(
      { article, next: "published" },
      { onSuccess: () => toast.success("Approved and published.") },
    );
  }

  function reject() {
    if (!rejecting) return;
    if (!note.trim()) {
      toast.error("Tell the contributor what needs fixing.");
      return;
    }
    changeStatus.mutate(
      { article: rejecting, next: "rejected", note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Sent back to the contributor.");
          setRejecting(null);
          setNote("");
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Submissions from contributors, oldest first. Approving publishes straight to the app."
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : (articles ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing waiting"
          description="When a contributor submits an article it lands here."
        />
      ) : (
        <StaggerList className="space-y-3">
          {(articles ?? []).map((article) => {
            const lead = article.images[0];
            const category = categories.get(article.categoryId);

            return (
              <StaggerItem key={article.id}>
                <Card>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                    <div className="bg-muted text-muted-foreground relative h-28 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-40">
                      {lead ? (
                        <NextImage
                          src={lead.url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="160px"
                        />
                      ) : (
                        <ImageIcon className="absolute inset-0 m-auto size-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {category && (
                          <Badge variant="secondary" className="font-normal">
                            {category.name}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {article.createdByName}
                          {article.updatedAt &&
                            ` · submitted ${formatDistanceToNow(article.updatedAt.toDate(), { addSuffix: true })}`}
                        </span>
                      </div>

                      <h2 className="leading-snug font-medium">{article.title}</h2>
                      {article.titleTa && (
                        <p className="text-muted-foreground font-tamil text-sm">
                          {article.titleTa}
                        </p>
                      )}
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {article.summary}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={changeStatus.isPending}
                        onClick={() => approve(article)}
                      >
                        <Check className="size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={changeStatus.isPending}
                        onClick={() => setRejecting(article)}
                      >
                        <X className="size-4" />
                        Send back
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" asChild>
                        <Link href={`/admin/news/${article.id}`}>
                          <SquarePen className="size-4" />
                          Open
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back for changes</DialogTitle>
            <DialogDescription>
              The contributor sees this note on the article and can edit it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="note">What needs fixing?</Label>
            <Textarea
              id="note"
              rows={4}
              value={note}
              placeholder="Add the venue and the organiser's name, then resubmit."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button onClick={reject} disabled={changeStatus.isPending}>
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
