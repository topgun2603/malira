"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronsUpDown,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PaginationBar } from "@/components/shared/pagination-bar";
import type { ServerPage } from "@/hooks/use-server-page";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_STATUSES,
  RECURRENCE_LABELS,
  type EventCategory,
  type EventItem,
  type EventStatus,
} from "@/lib/types";

/**
 * Sorting only. Filtering and paging both happen in Firestore, so a client-side
 * filter would narrow a page that has already been narrowed, and a client-side
 * paginator would page a page.
 *
 * Sorting therefore reorders the rows on screen rather than the whole diary —
 * the honest trade for not reading every event ever held to show twenty-five.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, EventItem>();
const EMPTY: EventItem[] = [];

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Live",
  cancelled: "Cancelled",
};

export interface EventFilterState {
  status: EventStatus | "all";
  category: EventCategory | "all";
}

export function EventsTable({
  page,
  filters,
  onFiltersChange,
  busy,
  onSetStatus,
  onEdit,
  onDelete,
}: {
  page: ServerPage<EventItem>;
  filters: EventFilterState;
  onFiltersChange: (next: EventFilterState) => void;
  busy: boolean;
  onSetStatus: (event: EventItem, status: EventStatus) => void;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
}) {
  const events = page.items;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("title", {
          header: "Event",
          cell: ({ row }) => {
            const event = row.original;
            return (
              <div className="min-w-0 max-w-80">
                <p className="truncate font-medium">{event.title}</p>
                {event.titleTa && (
                  <p className="text-muted-foreground font-tamil truncate text-sm">
                    {event.titleTa}
                  </p>
                )}
                <Badge variant="outline" className="mt-1 font-normal">
                  {EVENT_CATEGORY_LABELS[event.category]}
                </Badge>
                {event.recurrence !== "none" && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {RECURRENCE_LABELS[event.recurrence]}
                  </span>
                )}
              </div>
            );
          },
        }),

        helper.accessor((event) => event.startsAt?.toMillis() ?? 0, {
          id: "startsAt",
          header: "When",
          cell: ({ row }) =>
            row.original.startsAt ? (
              <span className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                <CalendarDays className="text-muted-foreground size-3.5" />
                {format(row.original.startsAt.toDate(), "d MMM yyyy, h:mm a")}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            ),
        }),

        helper.accessor("venue", {
          header: "Where",
          cell: ({ row }) =>
            row.original.venue ? (
              <span className="flex max-w-56 items-center gap-1.5 text-sm">
                <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                <span className="truncate">{row.original.venue}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            ),
        }),

        helper.display({
          id: "organiser",
          header: "Organiser",
          cell: ({ row }) => {
            const event = row.original;
            if (!event.organiserName && !event.organiserPhone) {
              return <span className="text-muted-foreground text-sm">—</span>;
            }
            return (
              <div className="min-w-0 text-sm">
                <p className="truncate">{event.organiserName || "—"}</p>
                {event.organiserPhone && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Phone className="size-3" />
                    {event.organiserPhone}
                  </p>
                )}
              </div>
            );
          },
        }),

        helper.accessor("status", {
          header: "Status",
          cell: ({ row }) => (
            <Badge
              variant={row.original.status === "published" ? "default" : "secondary"}
              className="font-normal whitespace-nowrap"
            >
              {STATUS_LABELS[row.original.status]}
            </Badge>
          ),
        }),

        helper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const event = row.original;
            return (
              <div className="flex justify-end gap-2">
                {event.status !== "published" ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onSetStatus(event, "published")}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onSetStatus(event, "cancelled")}
                  >
                    Cancel event
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onEdit(event)}>
                  Edit
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9"
                  aria-label={`Delete ${event.title}`}
                  onClick={() => onDelete(event)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            );
          },
        }),
      ]),
    [busy, onSetStatus, onEdit, onDelete],
  );

  const data = events.length > 0 ? events : EMPTY;

  const table = useTable({ features, columns, data }, (state) => ({
    sorting: state.sorting,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as EventFilterState["status"] })
          }
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {EVENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              category: value as EventFilterState["category"],
            })
          }
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any category</SelectItem>
            {EVENT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {EVENT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              {table.getRowModel().rows.map((row) => (
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
        noun="event"
      />
    </div>
  );
}
