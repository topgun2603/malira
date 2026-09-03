"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Star, Store } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import {
  useReviewVendor,
  useSetVendorFeatured,
  useVendorQueue,
} from "@/hooks/use-vendors";
import {
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_LABELS,
  isVendorLive,
  type Vendor,
  type VendorStatus,
} from "@/lib/types";

const QUEUES: Array<{ value: VendorStatus | "all"; label: string }> = [
  { value: "pending", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Sent back" },
  { value: "paused", label: "Paused" },
  { value: "all", label: "All" },
];

export default function VendorModerationPage() {
  const [queue, setQueue] = useState<VendorStatus | "all">("pending");
  const [reviewing, setReviewing] = useState<Vendor | null>(null);
  const { data, isLoading } = useVendorQueue(queue);

  return (
    <>
      <PageHeader
        title="Wedding services"
        description="Halls, catering, photography, decoration, transport and music. A listing appears once it is approved and paid for."
      />

      <div className="px-4 pb-10 sm:px-6">
        <Tabs
          value={queue}
          onValueChange={(value) => setQueue(value as VendorStatus | "all")}
        >
          <TabsList>
            {QUEUES.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={queue} className="mt-6">
            {isLoading ? (
              <TableSkeleton />
            ) : !data?.length ? (
              <EmptyState
                icon={Store}
                title="Nothing here"
                description="Listings appear as businesses submit them."
              />
            ) : (
              <div className="space-y-3">
                {data.map((vendor) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    onReview={() => setReviewing(vendor)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ReviewDialog vendor={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function VendorRow({
  vendor,
  onReview,
}: {
  vendor: Vendor;
  onReview: () => void;
}) {
  const setFeatured = useSetVendorFeatured();
  const live = isVendorLive(vendor);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 gap-3">
          {vendor.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendor.photos[0].url}
              alt=""
              className="border-border size-16 shrink-0 rounded-md border object-cover"
            />
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{vendor.name || "Unnamed"}</span>
              <Badge variant="outline" className="font-normal">
                {VENDOR_CATEGORY_LABELS[vendor.category]}
              </Badge>
              <Badge
                variant={vendor.status === "approved" ? "default" : "secondary"}
                className="font-normal"
              >
                {VENDOR_STATUS_LABELS[vendor.status]}
              </Badge>
              {/*
                Approved and live are different things, and the desk needs to
                see which. A listing can sit approved for weeks without ever
                appearing because nobody paid for it.
              */}
              {vendor.status === "approved" && (
                <Badge
                  variant={live ? "default" : "destructive"}
                  className="font-normal"
                >
                  {live ? "In the directory" : "Not paid"}
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground text-sm">
              {vendor.town || "No town"}
              {vendor.phone ? ` · ${vendor.phone}` : ""}
              {vendor.capacity ? ` · seats ${vendor.capacity}` : ""}
            </p>
            <p className="text-muted-foreground text-xs">
              {vendor.paidUntil
                ? `Paid until ${format(vendor.paidUntil.toDate(), "d MMM yyyy")}`
                : "Never paid for"}
              {vendor.reviewNote ? ` · “${vendor.reviewNote}”` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-2">
            <Star className="text-muted-foreground size-4" />
            <Label htmlFor={`f-${vendor.id}`} className="text-xs">
              Featured
            </Label>
            <Switch
              id={`f-${vendor.id}`}
              checked={vendor.featured}
              onCheckedChange={(checked) =>
                setFeatured.mutate({ id: vendor.id, featured: checked })
              }
            />
          </div>
          <Button onClick={onReview}>Review</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  vendor,
  onClose,
}: {
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const review = useReviewVendor();
  const [note, setNote] = useState("");

  function decide(status: "approved" | "rejected") {
    if (!vendor) return;
    review.mutate(
      { id: vendor.id, status, note },
      {
        onSuccess: () => {
          setNote("");
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={Boolean(vendor)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vendor?.name}</DialogTitle>
          <DialogDescription>
            Approving does not publish it on its own — the listing also has to be
            paid for.
          </DialogDescription>
        </DialogHeader>

        {vendor && (
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{vendor.about || "No description."}</p>
            <p className="text-muted-foreground">
              {vendor.address}
              {vendor.address && vendor.town ? ", " : ""}
              {vendor.town}
            </p>
            <p className="text-muted-foreground">
              {vendor.phone}
              {vendor.email ? ` · ${vendor.email}` : ""}
            </p>

            <div className="space-y-2">
              <Label htmlFor="note">Note to the business</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                placeholder="Required when sending it back. They are shown this."
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            disabled={review.isPending || !note.trim()}
            onClick={() => decide("rejected")}
          >
            Send back
          </Button>
          <Button disabled={review.isPending} onClick={() => decide("approved")}>
            {review.isPending && <Loader2 className="size-4 animate-spin" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
