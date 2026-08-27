"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";

export interface Page<T> {
  items: T[];
  /** Pass back as `after` for the next page; null when this page is the last. */
  cursor: DocumentSnapshot | null;
}

interface Options<T> {
  /** Identifies the query. Changing it starts again at page one. */
  key: readonly unknown[];
  fetchPage: (after: DocumentSnapshot | null, pageSize: number) => Promise<Page<T>>;
  /** Optional exact total, so the UI can say "page 2 of 9". */
  count?: () => Promise<number>;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Cursor pagination over a Firestore collection.
 *
 * Firestore cursors only go forwards, so stepping backwards means remembering
 * where each page started. That stack lives here alongside the page index and
 * the filter signature, in one piece of state: when the signature changes the
 * whole thing is simply derived fresh, which resets to page one without
 * setting state during a render or reaching for an effect.
 *
 * `keepPreviousData` holds the previous page on screen while the next one
 * loads, so paging does not blink through an empty table.
 */
export function useServerPage<T>({
  key,
  fetchPage,
  count,
  pageSize = 25,
  enabled = true,
}: Options<T>) {
  const [size, setSize] = useState(pageSize);
  const signature = JSON.stringify(key) + `:${size}`;

  const [stored, setStored] = useState<{
    signature: string;
    pageIndex: number;
    cursors: (DocumentSnapshot | null)[];
  }>({ signature, pageIndex: 0, cursors: [null] });

  // A changed signature means different rows; the old cursors point nowhere.
  const state =
    stored.signature === signature
      ? stored
      : { signature, pageIndex: 0, cursors: [null] as (DocumentSnapshot | null)[] };

  const query = useQuery({
    queryKey: [...key, size, state.pageIndex],
    queryFn: () => fetchPage(state.cursors[state.pageIndex] ?? null, size),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const totals = useQuery({
    queryKey: [...key, "count"],
    queryFn: () => count!(),
    enabled: enabled && Boolean(count),
    staleTime: 60_000,
  });

  const hasNext = Boolean(query.data?.cursor);
  const hasPrev = state.pageIndex > 0;

  function next() {
    const cursor = query.data?.cursor;
    if (!cursor) return;
    const cursors = [...state.cursors];
    cursors[state.pageIndex + 1] = cursor;
    setStored({ signature, pageIndex: state.pageIndex + 1, cursors });
  }

  function prev() {
    if (!hasPrev) return;
    setStored({ ...state, signature, pageIndex: state.pageIndex - 1 });
  }

  function setPageSize(value: number) {
    setSize(value);
  }

  const total = totals.data;
  const pageCount = total !== undefined ? Math.max(1, Math.ceil(total / size)) : undefined;

  return {
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    pageIndex: state.pageIndex,
    pageSize: size,
    setPageSize,
    hasNext,
    hasPrev,
    next,
    prev,
    total,
    pageCount,
  };
}

export type ServerPage<T> = ReturnType<typeof useServerPage<T>>;
