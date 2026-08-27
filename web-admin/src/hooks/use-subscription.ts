"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getSubscription,
  isPremium,
  remainingInterests,
  startPlanCheckout,
} from "@/lib/api/subscriptions";
import { useActivePlans, useMatrimonyLimits } from "@/hooks/use-plans";
import { useSentInterests } from "@/hooks/use-matrimony";
import { friendlyError } from "@/lib/firebase/errors";
import { DEFAULT_MATRIMONY_LIMITS } from "@/lib/types";

export const subscriptionKeys = {
  mine: (uid: string) => ["subscription", uid] as const,
};

export function useSubscription() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: subscriptionKeys.mine(uid),
    queryFn: () => getSubscription(uid),
    enabled: Boolean(uid),
    staleTime: 60_000,
  });
}

/**
 * Everything a matrimony screen needs to know about entitlement.
 *
 * The free allowance comes from the admin-edited settings document, so raising
 * or lowering it is a change the desk makes, not a redeploy.
 */
export function useEntitlement() {
  const { data: subscription, isLoading } = useSubscription();
  const { data: sent } = useSentInterests();
  const { data: limits } = useMatrimonyLimits();
  const { data: plans } = useActivePlans();

  const premium = isPremium(subscription);
  const freeInterests = limits?.freeInterestsPerMonth ?? DEFAULT_MATRIMONY_LIMITS.freeInterestsPerMonth;

  return {
    subscription,
    premium,
    loading: isLoading,
    plans: plans ?? [],
    freeProfileViews: limits?.freeProfileViews ?? DEFAULT_MATRIMONY_LIMITS.freeProfileViews,
    freeInterests,
    remaining: remainingInterests(sent ?? [], premium, freeInterests),
  };
}

export function useStartCheckout() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: (planId: string) =>
      startPlanCheckout(planId, profile?.displayName ?? ""),
    onSuccess: () => {
      toast.success("Payment received. Premium is active.");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error) => {
      const message = friendlyError(error);
      // A dismissed modal is a choice, not a failure.
      if (message.toLowerCase().includes("cancelled")) return;
      toast.error(message);
    },
  });
}
