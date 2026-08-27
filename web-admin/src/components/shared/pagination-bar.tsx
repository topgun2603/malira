"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [10, 25, 50];

/**
 * The paging control for every admin list.
 *
 * Deliberately prev/next rather than numbered pages: Firestore cursors only
 * step forwards, so "jump to page 7" would mean reading pages one to six to
 * find where seven starts. The exact total still comes from an aggregation
 * query, so the position is honest even though the jumps are not offered.
 */
export function PaginationBar({
  pageIndex,
  pageSize,
  setPageSize,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  total,
  pageCount,
  loading,
  noun = "item",
}: {
  pageIndex: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  total?: number;
  pageCount?: number;
  loading?: boolean;
  noun?: string;
}) {
  // Nothing to page and nothing to configure: stay out of the way.
  if (!hasPrev && !hasNext && (total ?? 0) <= pageSize) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        {loading && <Loader2 className="size-3.5 animate-spin" />}
        {total !== undefined ? (
          <>
            {total.toLocaleString("en-IN")} {total === 1 ? noun : `${noun}s`}
            {pageCount && pageCount > 1 && (
              <>
                {" · page "}
                {pageIndex + 1} of {pageCount}
              </>
            )}
          </>
        ) : (
          <>Page {pageIndex + 1}</>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => setPageSize(Number(value))}
        >
          <SelectTrigger className="w-32" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} a page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
