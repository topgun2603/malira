"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { friendlyError } from "@/lib/firebase/errors";
import {
  createVendor,
  deleteVendor,
  getVendor,
  listOwnVendors,
  listVendorsByStatus,
  reviewVendor,
  saveVendor,
  searchVendors,
  setVendorFeatured,
  setVendorOwnStatus,
  type VendorDraft,
  type VendorFilters,
} from "@/lib/api/vendors";
import type { VendorStatus } from "@/lib/types";

const keys = {
  all: ["vendors"] as const,
  search: (filters: VendorFilters) => ["vendors", "search", filters] as const,
  one: (id: string) => ["vendors", "one", id] as const,
  own: (uid: string) => ["vendors", "own", uid] as const,
  queue: (status: VendorStatus | "all") => ["vendors", "queue", status] as const,
};

/** The public directory. No sign-in: a listing nobody can find is worth little. */
export function useVendorSearch(filters: VendorFilters) {
  return useQuery({
    queryKey: keys.search(filters),
    queryFn: () => searchVendors(filters),
    staleTime: 60_000,
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: keys.one(id ?? ""),
    queryFn: () => getVendor(id as string),
    enabled: Boolean(id),
  });
}

export function useOwnVendors() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: keys.own(uid),
    queryFn: () => listOwnVendors(uid),
    enabled: Boolean(uid),
  });
}

export function useVendorQueue(status: VendorStatus | "all") {
  return useQuery({
    queryKey: keys.queue(status),
    queryFn: () => listVendorsByStatus(status),
    staleTime: 30_000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (draft: VendorDraft) =>
      createVendor(firebaseUser?.uid ?? "", draft),
    onSuccess: () => {
      toast.success("Sent for review. It goes live once approved and paid for.");
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSaveVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: VendorDraft }) =>
      saveVendor(id, draft),
    onSuccess: () => {
      // Said plainly: an edit costs review time, and people should know that
      // before they change a phone number on a listing that is currently live.
      toast.success("Saved. Edited listings go back to the desk for review.");
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetVendorOwnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "paused" | "pending";
    }) => setVendorOwnStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "paused" ? "Listing paused." : "Listing sent back for review.",
      );
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useReviewVendor() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: "approved" | "rejected";
      note?: string;
    }) => reviewVendor(id, { status, note, by: firebaseUser?.uid ?? "" }),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "approved"
          ? "Approved. It appears once the listing is paid for."
          : "Sent back with your note.",
      );
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetVendorFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      setVendorFeatured(id, featured),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Listing removed.");
      queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}
