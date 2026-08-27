"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  castVote,
  createPoll,
  deletePoll,
  getActivePoll,
  listPolls,
  setPollStatus,
  updatePoll,
  pollsPage,
  type PollDraft,
} from "@/lib/api/polls";
import {
  createAd,
  deleteAd,
  fetchAdsForPlacement,
  listAds,
  setAdStatus,
  updateAd,
  adsPage,
  type AdDraft,
} from "@/lib/api/ads";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";
import { useServerPage } from "@/hooks/use-server-page";
import {
  createCarousel,
  deleteCarousel,
  fetchCarouselArticles,
  getActiveCarousel,
  listCarousels,
  setCarouselStatus,
  updateCarousel,
  carouselsPage,
  type CarouselDraft,
} from "@/lib/api/carousels";
import type {
  Ad,
  AdPlacement,
  AdStatus,
  CarouselPlacement,
  CarouselStatus,
  Poll,
  PollStatus,
  StoryCarousel,
} from "@/lib/types";

export const pollKeys = {
  all: ["polls"] as const,
  active: (surface: string) => ["polls", "active", surface] as const,
};

export const adKeys = {
  all: ["ads"] as const,
  placement: (placement: AdPlacement) => ["ads", "placement", placement] as const,
};

/* ------------------------------- polls ------------------------------------ */

export function usePolls() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: pollKeys.all,
    queryFn: listPolls,
    enabled: can(profile?.role, "polls.manage"),
  });
}

export function useActivePoll(surface: "sidebar" | "article") {
  return useQuery({
    queryKey: pollKeys.active(surface),
    queryFn: () => getActivePoll(surface),
    staleTime: 2 * 60_000,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { firebaseUser, profile } = useAuth();
  return useMutation({
    mutationFn: (draft: PollDraft) =>
      createPoll(draft, {
        uid: firebaseUser?.uid ?? "",
        name: profile?.displayName ?? "",
      }),
    onSuccess: () => {
      toast.success("Poll created as a draft.");
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: PollDraft }) =>
      updatePoll(id, draft),
    onSuccess: () => {
      toast.success("Poll updated.");
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetPollStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PollStatus }) =>
      setPollStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "active"
          ? "Poll is live on the site."
          : status === "closed"
            ? "Poll closed. Results stay visible."
            : "Poll moved back to draft.",
      );
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePoll,
    onSuccess: () => {
      toast.success("Poll deleted.");
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      castVote(pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* -------------------------------- ads ------------------------------------- */

export function useAds() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: adKeys.all,
    queryFn: listAds,
    enabled: can(profile?.role, "ads.manage"),
  });
}

export function useAdsForPlacement(placement: AdPlacement) {
  return useQuery({
    queryKey: adKeys.placement(placement),
    queryFn: () => fetchAdsForPlacement(placement),
    staleTime: 5 * 60_000,
  });
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (draft: AdDraft) => createAd(draft, { uid: firebaseUser?.uid ?? "" }),
    onSuccess: () => {
      toast.success("Ad saved as a draft.");
      queryClient.invalidateQueries({ queryKey: adKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: AdDraft }) => updateAd(id, draft),
    onSuccess: () => {
      toast.success("Ad updated.");
      queryClient.invalidateQueries({ queryKey: adKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetAdStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdStatus }) =>
      setAdStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(status === "active" ? "Ad is running." : "Ad paused.");
      queryClient.invalidateQueries({ queryKey: adKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAd,
    onSuccess: () => {
      toast.success("Ad deleted.");
      queryClient.invalidateQueries({ queryKey: adKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* ----------------------------- carousels ---------------------------------- */


export const carouselKeys = {
  all: ["carousels"] as const,
  placement: (placement: CarouselPlacement) =>
    ["carousels", "placement", placement] as const,
  articles: (ids: string[]) => ["carousels", "articles", ids.join(",")] as const,
};

export function useCarousels() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: carouselKeys.all,
    queryFn: listCarousels,
    enabled: can(profile?.role, "carousels.manage"),
  });
}

export function useCarouselForPlacement(placement: CarouselPlacement) {
  return useQuery({
    queryKey: carouselKeys.placement(placement),
    queryFn: () => getActiveCarousel(placement),
    staleTime: 2 * 60_000,
  });
}

export function useCarouselArticles(ids: string[]) {
  return useQuery({
    queryKey: carouselKeys.articles(ids),
    queryFn: () => fetchCarouselArticles(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

export function useCreateCarousel() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (draft: CarouselDraft) =>
      createCarousel(draft, { uid: firebaseUser?.uid ?? "" }),
    onSuccess: () => {
      toast.success("Carousel saved as a draft.");
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateCarousel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: CarouselDraft }) =>
      updateCarousel(id, draft),
    onSuccess: () => {
      toast.success("Carousel updated.");
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetCarouselStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CarouselStatus }) =>
      setCarouselStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "active" ? "Carousel is live on the site." : "Carousel paused.",
      );
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteCarousel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCarousel,
    onSuccess: () => {
      toast.success("Carousel deleted.");
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* -------------------------------------------------------------------------- */
/*  Paged lists                                                                */
/* -------------------------------------------------------------------------- */

export function usePagedPolls() {
  const { profile } = useAuth();
  const page = pollsPage();
  return useServerPage<Poll>({
    key: ["polls", "paged"],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "polls.manage"),
  });
}

export function usePagedAds() {
  const { profile } = useAuth();
  const page = adsPage();
  return useServerPage<Ad>({
    key: ["ads", "paged"],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "ads.manage"),
  });
}

export function usePagedCarousels() {
  const { profile } = useAuth();
  const page = carouselsPage();
  return useServerPage<StoryCarousel>({
    key: ["carousels", "paged"],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "carousels.manage"),
  });
}
