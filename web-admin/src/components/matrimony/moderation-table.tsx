"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import NextImage from "next/image";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Eye,
  HeartHandshake,
  ImageOff,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { PaginationBar } from "@/components/shared/pagination-bar";
import type { ServerPage } from "@/hooks/use-server-page";
import { useProfilePhotos } from "@/hooks/use-matrimony";
import { ageFrom } from "@/lib/api/matrimony";
import {
  DIET_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  MATRIMONY_STATUS_LABELS,
  POSTED_BY_LABELS,
  type MatrimonyProfile,
} from "@/lib/types";

/**
 * Sorting only. Filtering and paging both happen in Firestore now, so a
 * client-side filter would narrow a page that has already been narrowed, and a
 * client-side paginator would page a page.
 *
 * Sorting therefore orders the rows on screen rather than the whole queue —
 * the honest trade for not reading every profile to show twenty-five.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, MatrimonyProfile>();
const EMPTY: MatrimonyProfile[] = [];

/* -------------------------------------------------------------------------- */
/*  Photographs                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A profile that holds its photos back keeps them in the private subcollection,
 * so the public document's array is empty. Moderators are allowed to read that
 * — approving a listing you have not seen is not moderation.
 */
export function ProfilePhotoCell({ profile }: { profile: MatrimonyProfile }) {
  const { photos, loading } = useProfilePhotos(profile);
  const [open, setOpen] = useState(false);

  if (!profile.hasPhotos) {
    return (
      <div className="text-muted-foreground flex size-14 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed">
        <ImageOff className="size-3.5" />
        <span className="text-[9px]">none</span>
      </div>
    );
  }

  if (loading) {
    return <div className="bg-muted size-14 animate-pulse rounded-md" />;
  }

  if (photos.length === 0) {
    return (
      <div className="text-muted-foreground flex size-14 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed">
        <ImageOff className="size-3.5" />
        <span className="text-[9px]">failed</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${photos.length} photo(s) of ${profile.name}`}
        className="bg-muted focus-visible:ring-ring relative size-14 overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:outline-none"
      >
        <NextImage
          src={photos[0].url}
          alt=""
          fill
          unoptimized
          className="object-cover"
          sizes="56px"
        />
        {photos.length > 1 && (
          <span className="absolute right-0 bottom-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">
            {photos.length}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{profile.name}</DialogTitle>
            <DialogDescription>
              {photos.length} {photos.length === 1 ? "photograph" : "photographs"} ·{" "}
              {profile.photoVisibility === "members"
                ? "visible to members once approved"
                : "held back until an interest is accepted"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <div
                key={photo.path}
                className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg border"
              >
                <NextImage
                  src={photo.url}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                      */
/* -------------------------------------------------------------------------- */

export interface ModerationFilterState {
  search: string;
  gender: "all" | "male" | "female";
  marital: string;
}

export function ModerationTable({
  page,
  filters,
  onFiltersChange,
  busy,
  onApprove,
  onReject,
  onReview,
}: {
  page: ServerPage<MatrimonyProfile>;
  filters: ModerationFilterState;
  onFiltersChange: (next: ModerationFilterState) => void;
  busy: boolean;
  onApprove: (profile: MatrimonyProfile) => void;
  onReject: (profile: MatrimonyProfile) => void;
  /** Opens the full listing. The row buttons decide; this is how you look. */
  onReview: (profile: MatrimonyProfile) => void;
}) {
  const { search, gender, marital } = filters;
  const profiles = page.items;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "photo",
          header: "Photo",
          cell: ({ row }) => <ProfilePhotoCell profile={row.original} />,
        }),

        helper.accessor("name", {
          header: "Candidate",
          cell: ({ row }) => {
            const profile = row.original;
            const age = ageFrom(profile.dob);
            return (
              <div className="min-w-0">
                <p className="font-medium">{profile.name}</p>
                <p className="text-muted-foreground text-xs">
                  {age !== null && `${age} · `}
                  {profile.gender === "male" ? "Male" : "Female"}
                  {profile.heightCm > 0 && ` · ${profile.heightCm} cm`}
                </p>
                <p className="text-muted-foreground text-xs">
                  {MARITAL_STATUS_LABELS[profile.maritalStatus]} ·{" "}
                  {DIET_LABELS[profile.diet]}
                </p>
              </div>
            );
          },
        }),

        helper.display({
          id: "details",
          header: "Education & work",
          cell: ({ row }) => {
            const profile = row.original;
            return (
              <div className="text-muted-foreground max-w-72 min-w-0 text-sm">
                <p className="text-foreground truncate">
                  {[profile.education, profile.occupation]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="truncate text-xs">
                  {[profile.workLocation, profile.hometown]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            );
          },
        }),

        helper.accessor("postedBy", {
          header: "Posted by",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {POSTED_BY_LABELS[row.original.postedBy]}
            </span>
          ),
        }),

        helper.accessor("status", {
          header: "Status",
          cell: ({ row }) => (
            <Badge
              variant={row.original.status === "approved" ? "default" : "secondary"}
              className="font-normal whitespace-nowrap"
            >
              {MATRIMONY_STATUS_LABELS[row.original.status]}
            </Badge>
          ),
        }),

        helper.accessor((profile) => profile.updatedAt?.toMillis() ?? 0, {
          id: "updatedAt",
          header: "Updated",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {row.original.updatedAt
                ? formatDistanceToNow(row.original.updatedAt.toDate(), {
                    addSuffix: true,
                  })
                : "—"}
            </span>
          ),
        }),

        helper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const profile = row.original;
            return (
              <div className="flex justify-end gap-2">
                {/* Reading comes before deciding, so it leads. */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(profile)}
                >
                  <Eye className="size-4" />
                  Review
                </Button>
                {profile.status !== "approved" && (
                  <Button size="sm" disabled={busy} onClick={() => onApprove(profile)}>
                    <Check className="size-4" />
                    Approve
                  </Button>
                )}
                {profile.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onReject(profile)}
                  >
                    <X className="size-4" />
                    Send back
                  </Button>
                )}
              </div>
            );
          },
        }),
      ]),
    [busy, onApprove, onReject, onReview],
  );

  const data = profiles.length > 0 ? profiles : EMPTY;

  const table = useTable(
    {
      features,
      columns,
      data,
    },
    (state) => ({ sorting: state.sorting }),
  );

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* ------------------------------ toolbar --------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            placeholder="Search name, education, work or town"
            className="pl-9"
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          />
        </div>

        <Select value={gender} onValueChange={(v) => onFiltersChange({ ...filters, gender: v as ModerationFilterState["gender"] })}>
          <SelectTrigger className="sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any gender</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={marital}
          onValueChange={(v) => onFiltersChange({ ...filters, marital: v })}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any marital status</SelectItem>
            {MARITAL_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {MARITAL_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {/* ------------------------------- table ---------------------------- */}
      {profiles.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="Nothing matches"
          description={
            page.isLoading
              ? "Loading..."
              : "Nothing in this queue matches the current filters."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id} className="hover:bg-transparent">
                      {group.headers.map((header) => {
                        const sortable = header.column.getCanSort?.() ?? false;
                        const sorted = header.column.getIsSorted?.();
                        return (
                          <TableHead key={header.id} className="h-10">
                            {header.isPlaceholder ? null : sortable ? (
                              <button
                                type="button"
                                className="hover:text-foreground flex items-center gap-1"
                                onClick={header.column.getToggleSortingHandler?.()}
                              >
                                <table.FlexRender header={header} />
                                {sorted === "asc" ? (
                                  <ArrowUp className="size-3" />
                                ) : sorted === "desc" ? (
                                  <ArrowDown className="size-3" />
                                ) : (
                                  <ChevronsUpDown className="size-3 opacity-40" />
                                )}
                              </button>
                            ) : (
                              <table.FlexRender header={header} />
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 align-top">
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

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
            noun="profile"
          />
        </>
      )}
    </div>
  );
}

