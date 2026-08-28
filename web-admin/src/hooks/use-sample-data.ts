"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  countSampleArticles,
  removeSampleArticles,
  seedSampleArticles,
} from "@/lib/api/sample-data";
import { categoryKeys } from "@/hooks/use-categories";
import { articleKeys } from "@/hooks/use-articles";
import { adKeys, carouselKeys, pollKeys } from "@/hooks/use-engagement";
import { eventKeys, musicKeys } from "@/hooks/use-phase2";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";

export const sampleKeys = { count: ["sample", "count"] as const };

export function useSampleCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: sampleKeys.count,
    queryFn: countSampleArticles,
    enabled: can(profile?.role, "news.publish"),
    staleTime: 30_000,
  });
}

export function useSeedSampleArticles() {
  const queryClient = useQueryClient();
  const { firebaseUser, profile } = useAuth();

  return useMutation({
    mutationFn: () =>
      seedSampleArticles({
        uid: firebaseUser?.uid ?? "",
        name: profile?.displayName ?? "MALIRA",
      }),
    onSuccess: (result) => {
      const imagePart =
        result.imageFailures > 0
          ? ` ${result.imagesUploaded} images uploaded, ${result.imageFailures} failed: ${result.imageError ?? "unknown error"}`
          : ` ${result.imagesUploaded} images uploaded.`;
      toast.success(
        `Added ${result.articles} articles, ${result.events} events, ${result.songs} songs, ${result.matrimony} matrimony profiles, ${result.polls} poll, ${result.ads} ads and ${result.carousels} carousel.${imagePart}`,
      );
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
      queryClient.invalidateQueries({ queryKey: adKeys.all });
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: musicKeys.playlists });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      queryClient.invalidateQueries({ queryKey: sampleKeys.count });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useRemoveSampleArticles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeSampleArticles,
    onSuccess: (count) => {
      toast.success(`Removed ${count} sample documents.`);
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
      queryClient.invalidateQueries({ queryKey: adKeys.all });
      queryClient.invalidateQueries({ queryKey: carouselKeys.all });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: musicKeys.playlists });
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      queryClient.invalidateQueries({ queryKey: sampleKeys.count });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}
