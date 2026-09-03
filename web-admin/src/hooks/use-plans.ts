"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createPlan,
  deletePlan,
  getMatrimonyLimits,
  listActivePlans,
  listPlans,
  saveMatrimonyLimits,
  seedDefaultPlan,
  updatePlan,
  plansPage,
  type PlanDraft,
} from "@/lib/api/plans";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";
import { useServerPage } from "@/hooks/use-server-page";
import type { MatrimonyLimits, SubscriptionPlan } from "@/lib/types";

export const planKeys = {
  all: ["plans"] as const,
  active: ["plans", "active"] as const,
  limits: ["plans", "limits"] as const,
};

/** Public: the landing page prices are marketing and render before sign-in. */
/**
 * The plans on sale, for one side of the product.
 *
 * Wrapped rather than passed by reference: react-query hands its own context to
 * a bare function reference, which would arrive as the `kind` argument and
 * quietly return the wrong list.
 */
export function useActivePlans(kind: SubscriptionPlan["kind"] = "matrimony") {
  return useQuery({
    queryKey: [...planKeys.active, kind],
    queryFn: () => listActivePlans(kind),
    staleTime: 5 * 60_000,
  });
}

export function useMatrimonyLimits() {
  return useQuery({
    queryKey: planKeys.limits,
    queryFn: getMatrimonyLimits,
    staleTime: 5 * 60_000,
  });
}

export function usePlans() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: planKeys.all,
    queryFn: listPlans,
    enabled: can(profile?.role, "settings.manage"),
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["plans"] });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      toast.success("Plan created.");
      invalidateAll(queryClient);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: Partial<PlanDraft> }) =>
      updatePlan(id, draft),
    onSuccess: () => {
      toast.success("Plan updated.");
      invalidateAll(queryClient);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      toast.success("Plan removed.");
      invalidateAll(queryClient);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSeedDefaultPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedDefaultPlan,
    onSuccess: (count) => {
      toast.success(count > 0 ? "Default plan added." : "Plans already exist.");
      invalidateAll(queryClient);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSaveMatrimonyLimits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limits: MatrimonyLimits) => saveMatrimonyLimits(limits),
    onSuccess: () => {
      toast.success("Free allowance saved.");
      invalidateAll(queryClient);
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/** Server-paged plans, for the admin list. */
export function usePagedPlans() {
  const { profile } = useAuth();
  const page = plansPage();
  return useServerPage<SubscriptionPlan>({
    key: ["plans", "paged"],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "settings.manage"),
  });
}
