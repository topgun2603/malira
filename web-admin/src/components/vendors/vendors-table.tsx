"use client";

import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  isVendorLive,
  type Vendor,
  type VendorCategory,
  type VendorStatus,
} from "@/lib/types";

/**
 * Sorting and paging both client-side, unlike the matrimony queue.
 *
 * That queue pages in Firestore because it grows with the readership. This one
 * grows with the number of businesses in the Nilgiris, which is a few hundred
 * at the outside — so the honest trade is the other way round: fetch the queue
 * once and let the browser filter and page it, rather than buy a composite
 * index for every combination of status, category and paid state.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const helper = createColumnHelper<typeof features, Vendor>();
const EMPTY: Vendor[] = [];

export interface VendorFilterState {
  search: string;
  status: VendorStatus | "all";
  category: VendorCategory | "all";
  paid: "all" | "live" | "unpaid" | "expiring";
  from: string;
  to: string;
}

export const EMPTY_VENDOR_FILTERS: VendorFilterState = {
  search: "",
  status: "all",
  category: "all",
  paid: "all",
  from: "",
  to: "",
};

/** Within a month of lapsing — the listings worth chasing a renewal for. */
function expiringSoon(vendor: Vendor, now: Date) {
  if (!vendor.paidUntil) return false;
  const until = vendor.paidUntil.toDate();
  if (until <= now) return false;
  const month = new Date(now);
  month.setMonth(month.getMonth() + 1);
  return until <= month;
}

export function applyVendorFilters(
  rows: Vendor[],
  filters: VendorFilterState,
): Vendor[] {
  const now = new Date();
  const term = filters.search.trim().toLowerCase();
  const from = filters.from ? new Date(filters.from) : null;
  // Inclusive of the whole closing day: a range typed as 1st to 3rd plainly
  // means everything on the 3rd as well.
  const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;

  return rows.filter((vendor) => {
    if (filters.status !== "all" && vendor.status !== filters.status) return false;
    if (filters.category !== "all" && vendor.category !== filters.category) {
      return false;
    }

    if (filters.paid === "live" && !isVendorLive(vendor, now)) return false;
    if (filters.paid === "unpaid" && isVendorLive(vendor, now)) return false;
    if (filters.paid === "expiring" && !expiringSoon(vendor, now)) return false;

    const created = vendor.createdAt?.toDate() ?? null;
    if (from && (!created || created < from)) return false;
    if (to && (!created || created > to)) return false;

    if (!term) return true;
    return [vendor.name, vendor.town, vendor.phone, vendor.email]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term));
  });
}

export function VendorsTable({
  vendors,
  filters,
  onFiltersChange,
  actions,
}: {
  vendors: Vendor[];
  filters: VendorFilterState;
  onFiltersChange: (next: VendorFilterState) => void;
  /** Rendered in the last column. The table shows; the page decides. */
  actions: (vendor: Vendor) => React.ReactNode;
}) {
  const now = new Date();
  const set = <K extends keyof VendorFilterState>(
    key: K,
    value: VendorFilterState[K],
  ) => onFiltersChange({ ...filters, [key]: value });

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: "Listing",
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {VENDOR_CATEGORY_LABELS[row.original.category]}
                {row.original.town ? ` · ${row.original.town}` : ""}
              </p>
            </div>
          ),
        }),
        helper.accessor("phone", {
          header: "Contact",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
              {row.original.phone || "—"}
            </span>
          ),
        }),
        helper.accessor("status", {
          header: "Status",
          cell: ({ row }) => (
            <Badge
              variant={row.original.status === "approved" ? "default" : "secondary"}
              className="font-normal"
            >
              {VENDOR_STATUS_LABELS[row.original.status]}
            </Badge>
          ),
        }),
        helper.accessor((vendor) => vendor.paidUntil?.toMillis() ?? 0, {
          id: "paidUntil",
          header: "Paid until",
          cell: ({ row }) => {
            const vendor = row.original;
            if (!vendor.paidUntil) {
              return (
                <span className="text-muted-foreground text-sm">Never paid</span>
              );
            }
            const until = vendor.paidUntil.toDate();
            const lapsed = until <= now;
            return (
              <span
                className={
                  lapsed ? "text-destructive text-sm" : "text-sm"
                }
              >
                {format(until, "d MMM yyyy")}
              </span>
            );
          },
        }),
        helper.display({
          id: "live",
          header: "In directory",
          cell: ({ row }) =>
            isVendorLive(row.original, now) ? (
              <Badge className="font-normal">Live</Badge>
            ) : (
              <span className="text-muted-foreground text-sm">No</span>
            ),
        }),
        helper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex justify-end gap-2">{actions(row.original)}</div>
          ),
        }),
      ]),
    // `now` is recreated every render and would defeat the memo; the cells read
    // it from the closure and a minute's staleness cannot matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions],
  );

  const filtered = useMemo(
    () => applyVendorFilters(vendors, filters),
    [vendors, filters],
  );

  const table = useTable(
    {
      features,
      columns,
      data: filtered.length > 0 ? filtered : EMPTY,
      initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
    },
    (state) => ({ sorting: state.sorting, pagination: state.pagination }),
  );

  const rows = table.getRowModel().rows;
  const pageIndex = table.options.state?.pagination?.pageIndex ?? 0;
  const pageSize = table.options.state?.pagination?.pageSize ?? 25;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-4">
      {/* ------------------------------- filters --------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Label className="mb-1.5 block text-xs">Search</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={filters.search}
              placeholder="Name, town, phone or email"
              className="pl-9"
              onChange={(event) => set("search", event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => set("status", v as VendorFilterState["status"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {VENDOR_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {VENDOR_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Category</Label>
          <Select
            value={filters.category}
            onValueChange={(v) =>
              set("category", v as VendorFilterState["category"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {VENDOR_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {VENDOR_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Subscription</Label>
          <Select
            value={filters.paid}
            onValueChange={(v) => set("paid", v as VendorFilterState["paid"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="live">Paid and live</SelectItem>
              <SelectItem value="expiring">Lapsing within a month</SelectItem>
              <SelectItem value="unpaid">Not in the directory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Added from</Label>
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => set("from", event.target.value)}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">To</Label>
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => set("to", event.target.value)}
          />
        </div>
      </div>

      {/* -------------------------------- table ---------------------------- */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches"
          description="No listing matches these filters. Widen them and try again."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id}>
                    {group.headers.map((header) => {
                      const sortable = header.column.getCanSort?.() ?? false;
                      const sorted = header.column.getIsSorted?.();
                      return (
                        <TableHead key={header.id}>
                          {sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler?.()}
                              className="hover:text-foreground inline-flex items-center gap-1"
                            >
                              <table.FlexRender header={header} />
                              {sorted === "asc" ? (
                                <ArrowUp className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ArrowUpDown className="size-3.5 opacity-40" />
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
                      <TableCell key={cell.id} className="align-middle">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ----------------------------- paging ---------------------------- */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {filtered.length} listing{filtered.length === 1 ? "" : "s"} ·{" "}
              page {pageIndex + 1} of {Math.max(pageCount, 1)}
            </p>

            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} a page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
