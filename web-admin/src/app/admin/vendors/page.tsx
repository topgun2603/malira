"use client";

import { useState } from "react";
import {
  CalendarPlus,
  Loader2,
  PauseCircle,
  PlayCircle,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  useGrantVendorTerm,
  useReviewVendor,
  useSetVendorFeatured,
  useSetVendorPaused,
  useVendorQueue,
} from "@/hooks/use-vendors";
import {
  EMPTY_VENDOR_FILTERS,
  VendorsTable,
  type VendorFilterState,
} from "@/components/vendors/vendors-table";
import {
  isVendorLive,
  type Vendor,
} from "@/lib/types";


export default function VendorModerationPage() {
  const [filters, setFilters] = useState<VendorFilterState>(EMPTY_VENDOR_FILTERS);
  const [reviewing, setReviewing] = useState<Vendor | null>(null);

  // Everything, filtered in the browser. See the note in VendorsTable: this
  // collection grows with the district's businesses, not its readership.
  const { data, isLoading } = useVendorQueue("all");
  const pause = useSetVendorPaused();
  const grant = useGrantVendorTerm();
  const setFeatured = useSetVendorFeatured();

  return (
    <>
      <PageHeader
        title="Wedding services"
        description="Halls, catering, photography, decoration, transport and music. A listing appears once it is approved and paid for."
      />

      <div className="px-4 pb-10 sm:px-6">
        {isLoading ? (
          <TableSkeleton />
        ) : !data?.length ? (
          <EmptyState
            icon={Store}
            title="Nothing here"
            description="Listings appear as businesses submit them."
          />
        ) : (
          <VendorsTable
            vendors={data}
            filters={filters}
            onFiltersChange={setFilters}
            actions={(vendor) => (
              <>
                <Button size="sm" variant="outline" onClick={() => setReviewing(vendor)}>
                  Review
                </Button>

                {/* Paid placement, set by the desk rather than bought. */}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={vendor.featured ? "Remove from featured" : "Feature"}
                  onClick={() =>
                    setFeatured.mutate({
                      id: vendor.id,
                      featured: !vendor.featured,
                    })
                  }
                >
                  <Star
                    className={
                      vendor.featured
                        ? "size-4 fill-current text-amber-500"
                        : "size-4"
                    }
                  />
                </Button>

                {/* A year of directory listing, without a payment passing
                    through the site — most of this district settles up in
                    person. Matches the ₹199 vendor plan. */}
                {!isVendorLive(vendor) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={grant.isPending}
                    onClick={() =>
                      grant.mutate({
                        id: vendor.id,
                        months: 12,
                        current: vendor.paidUntil,
                      })
                    }
                  >
                    <CalendarPlus className="size-4" />
                    Grant a year
                  </Button>
                )}

                {vendor.status === "approved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pause.isPending}
                    onClick={() => pause.mutate({ id: vendor.id, paused: true })}
                  >
                    <PauseCircle className="size-4" />
                    Pause
                  </Button>
                ) : vendor.status === "paused" ? (
                  <Button
                    size="sm"
                    disabled={pause.isPending}
                    onClick={() => pause.mutate({ id: vendor.id, paused: false })}
                  >
                    <PlayCircle className="size-4" />
                    Resume
                  </Button>
                ) : null}
              </>
            )}
          />
        )}
      </div>

      <ReviewDialog vendor={reviewing} onClose={() => setReviewing(null)} />
    </>
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
